"""
Test suite for the ChromaDB vector storage module.
Tests use an in-memory EphemeralClient — no disk I/O or persistent state.
"""
import sys
from pathlib import Path

import pytest

# Make ai-service importable
_AI_SERVICE_DIR = Path(__file__).resolve().parent.parent
if str(_AI_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(_AI_SERVICE_DIR))

from vector_store.chroma_store import (
    COLLECTION_NAME,
    ChromaStoreError,
    delete_collection,
    get_chroma_client,
    get_collection_count,
    get_or_create_collection,
    store_embeddings,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_chunk(
    chunk_id: str = "doc.pdf_p1_c0",
    text: str = "Some page content about Rajasthan DTE courses.",
    embedding: list | None = None,
    doc: str = "doc.pdf",
    page: int = 1,
    idx: int = 0,
    src: str = "/data/doc.pdf",
) -> dict:
    return {
        "chunk_id": chunk_id,
        "text": text,
        "embedding": embedding if embedding is not None else [0.1, 0.2, 0.3],
        "document_name": doc,
        "page_number": page,
        "chunk_index": idx,
        "source_path": src,
    }


@pytest.fixture
def ephemeral_client():
    """Fresh in-memory ChromaDB client for each test."""
    return get_chroma_client(ephemeral=True)


@pytest.fixture
def collection(ephemeral_client):
    """Fresh collection inside the ephemeral client with teardown isolation."""
    col = get_or_create_collection(ephemeral_client)
    yield col
    try:
        delete_collection(ephemeral_client, col.name)
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Client initialisation
# ---------------------------------------------------------------------------

class TestClientInitialization:
    def test_ephemeral_client_returns_valid_instance(self):
        """EphemeralClient returns a usable ClientAPI object."""
        import chromadb
        client = get_chroma_client(ephemeral=True)
        assert client is not None
        # Must support list_collections
        assert hasattr(client, "list_collections")

    def test_persistent_client_creates_directory(self, tmp_path):
        """PersistentClient creates the target directory if absent."""
        chroma_dir = tmp_path / "chroma_db"
        assert not chroma_dir.exists()
        client = get_chroma_client(persist_path=str(chroma_dir))
        assert chroma_dir.exists()


# ---------------------------------------------------------------------------
# Collection creation
# ---------------------------------------------------------------------------

class TestCollectionCreation:
    def test_collection_creation(self, ephemeral_client):
        """get_or_create_collection returns a Collection object."""
        col = get_or_create_collection(ephemeral_client)
        assert col is not None
        assert col.name == COLLECTION_NAME

    def test_collection_creation_idempotent(self, ephemeral_client):
        """Calling get_or_create_collection twice does not raise."""
        col1 = get_or_create_collection(ephemeral_client)
        col2 = get_or_create_collection(ephemeral_client)
        assert col1.name == col2.name

    def test_custom_collection_name(self, ephemeral_client):
        """A custom collection name is respected."""
        col = get_or_create_collection(ephemeral_client, collection_name="custom_col")
        assert col.name == "custom_col"


# ---------------------------------------------------------------------------
# Storing embeddings
# ---------------------------------------------------------------------------

class TestStoreEmbeddings:
    def test_store_single_chunk(self, collection):
        """Storing one chunk returns 1 and increments the count to 1."""
        n = store_embeddings([make_chunk()], collection)
        assert n == 1
        assert get_collection_count(collection) == 1

    def test_store_multiple_chunks(self, collection):
        """Storing N chunks returns N and increments the count to N."""
        chunks = [make_chunk(chunk_id=f"doc.pdf_p1_c{i}", idx=i) for i in range(5)]
        n = store_embeddings(chunks, collection)
        assert n == 5
        assert get_collection_count(collection) == 5

    def test_empty_input_returns_zero(self, collection):
        """Calling store_embeddings with an empty list returns 0 without error."""
        n = store_embeddings([], collection)
        assert n == 0
        assert get_collection_count(collection) == 0

    def test_upsert_duplicate_id_does_not_duplicate(self, collection):
        """Storing the same chunk_id twice keeps count at 1; document is updated."""
        chunk = make_chunk(text="Original text")
        store_embeddings([chunk], collection)
        assert get_collection_count(collection) == 1

        updated = make_chunk(text="Updated text")
        store_embeddings([updated], collection)
        assert get_collection_count(collection) == 1

        result = collection.get(ids=[chunk["chunk_id"]], include=["documents"])
        assert result["documents"][0] == "Updated text"

    def test_chunks_must_be_list(self, collection):
        """Passing a non-list raises TypeError."""
        with pytest.raises(TypeError):
            store_embeddings("not a list", collection)


# ---------------------------------------------------------------------------
# Metadata preservation
# ---------------------------------------------------------------------------

class TestMetadataPreservation:
    def test_metadata_stored_correctly(self, collection):
        """Stored metadata fields match the input chunk."""
        chunk = make_chunk(
            chunk_id="meta_test",
            doc="guide.pdf",
            page=3,
            idx=7,
            src="/docs/guide.pdf",
        )
        store_embeddings([chunk], collection)

        result = collection.get(
            ids=["meta_test"],
            include=["metadatas", "documents"],
        )
        meta = result["metadatas"][0]
        assert meta["document_name"] == "guide.pdf"
        assert meta["page_number"] == 3
        assert meta["chunk_index"] == 7
        assert meta["source_path"] == "/docs/guide.pdf"

    def test_document_text_stored_correctly(self, collection):
        """Document text stored in ChromaDB matches the input text (stripped)."""
        chunk = make_chunk(text="  Rajasthan Polytechnic admission process.  ")
        store_embeddings([chunk], collection)
        result = collection.get(ids=[chunk["chunk_id"]], include=["documents"])
        assert result["documents"][0] == "Rajasthan Polytechnic admission process."


# ---------------------------------------------------------------------------
# get_collection_count
# ---------------------------------------------------------------------------

class TestCollectionCount:
    def test_empty_collection_count_is_zero(self, collection):
        assert get_collection_count(collection) == 0

    def test_count_matches_stored_items(self, collection):
        chunks = [make_chunk(chunk_id=f"c{i}", idx=i) for i in range(3)]
        store_embeddings(chunks, collection)
        assert get_collection_count(collection) == 3


# ---------------------------------------------------------------------------
# Validation — missing / bad fields
# ---------------------------------------------------------------------------

class TestChunkValidation:
    def test_missing_chunk_id_raises(self, collection):
        bad = make_chunk()
        del bad["chunk_id"]
        with pytest.raises(ValueError, match="missing required key"):
            store_embeddings([bad], collection)

    def test_missing_text_raises(self, collection):
        bad = make_chunk()
        del bad["text"]
        with pytest.raises(ValueError, match="missing required key"):
            store_embeddings([bad], collection)

    def test_empty_text_raises(self, collection):
        bad = make_chunk(text="   ")
        with pytest.raises(ValueError, match="non-empty string"):
            store_embeddings([bad], collection)

    def test_missing_embedding_raises(self, collection):
        bad = make_chunk()
        del bad["embedding"]
        with pytest.raises(ValueError, match="missing required key"):
            store_embeddings([bad], collection)

    def test_empty_embedding_raises(self, collection):
        bad = make_chunk(embedding=[])
        with pytest.raises(ValueError, match="non-empty list"):
            store_embeddings([bad], collection)

    def test_invalid_embedding_values_raises(self, collection):
        """Non-numeric values inside the embedding list raise ValueError."""
        bad = make_chunk(embedding=["not_a_number", 0.5, 0.3])
        with pytest.raises(ValueError, match="not a valid number"):
            store_embeddings([bad], collection)

    def test_inconsistent_embedding_dimensions_raises(self, collection):
        """Two chunks with different embedding sizes raise ValueError."""
        chunks = [
            make_chunk(chunk_id="c0", embedding=[0.1, 0.2, 0.3]),
            make_chunk(chunk_id="c1", embedding=[0.1, 0.2]),
        ]
        with pytest.raises(ValueError, match="[Ii]nconsistent embedding dimension"):
            store_embeddings(chunks, collection)

    def test_non_dict_chunk_raises(self, collection):
        """A non-dict item inside the chunk list raises TypeError."""
        with pytest.raises(TypeError):
            store_embeddings(["not_a_dict"], collection)


# ---------------------------------------------------------------------------
# Collection deletion
# ---------------------------------------------------------------------------

class TestCollectionDeletion:
    def test_delete_collection(self, ephemeral_client):
        """After deletion the collection no longer appears in list_collections."""
        get_or_create_collection(ephemeral_client, "temp_col")
        # Confirm it was created
        names_before = [c.name for c in ephemeral_client.list_collections()]
        assert "temp_col" in names_before

        delete_collection(ephemeral_client, "temp_col")

        names_after = [c.name for c in ephemeral_client.list_collections()]
        assert "temp_col" not in names_after


# ---------------------------------------------------------------------------
# Package import
# ---------------------------------------------------------------------------

class TestPackageImport:
    def test_import_from_package(self):
        """Public symbols are importable directly from the vector_store package."""
        from vector_store import (  # noqa: F401
            ChromaStoreError,
            delete_collection,
            get_chroma_client,
            get_collection_count,
            get_or_create_collection,
            store_embeddings,
        )

