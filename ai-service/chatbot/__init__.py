"""Chatbot module for Rajasthan DTE Student Assistance."""
try:
    from chatbot.generator import ask_chatbot, generate_response
    from chatbot.prompt import RAG_SYSTEM_INSTRUCTION, SYSTEM_INSTRUCTION
except ImportError:
    from .generator import ask_chatbot, generate_response
    from .prompt import RAG_SYSTEM_INSTRUCTION, SYSTEM_INSTRUCTION

__all__ = [
    "ask_chatbot",
    "generate_response",
    "SYSTEM_INSTRUCTION",
    "RAG_SYSTEM_INSTRUCTION",
]
