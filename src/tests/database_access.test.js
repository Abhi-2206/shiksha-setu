/**
 * Comprehensive Database Schema, Relationships, and Access Rules Test Suite.
 * Uses isolated test database: shiksha_setu_test
 * 
 * Verifies:
 * 1. Student profile creation, retrieval, and updates
 * 2. Profile ownership restrictions (rejection of ID tampering)
 * 3. Student/admin role permissions (self-promotion prevention)
 * 4. Chat session ownership and cross-user isolation
 * 5. Chat message relationships, sender types, and citation metadata
 * 6. College and cutoff data relationships
 * 7. Composite unique constraints and duplicate rejection
 * 8. Unauthorized access rejection (401 and 403)
 */
const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");

// Use shared Prisma client (points to test database when DATABASE_URL is set)
const prisma = require("../lib/prisma");

// Import services and middleware
const profileService = require("../services/studentProfile.service");
const chatService = require("../services/chat.service");
const collegeService = require("../services/college.service");
const { requireRole, requireSelfOrAdmin } = require("../middleware/rbac.middleware");

// Mock users for testing
let studentUser1;
let studentUser2;
let adminUser;

describe("Task 1: Database Schema, Migrations, and Access Rules", () => {
  before(async () => {
    // Clean test database tables before starting
    await prisma.chatMessage.deleteMany({});
    await prisma.chatSession.deleteMany({});
    await prisma.studentProfile.deleteMany({});
    await prisma.collegeCutoff.deleteMany({});
    await prisma.college.deleteMany({});
    await prisma.user.deleteMany({});

    const passwordHash = await bcrypt.hash("TestPassword123!", 10);

    // Create primary student user
    studentUser1 = await prisma.user.create({
      data: {
        name: "Rahul Sharma",
        email: "rahul.sharma@example.com",
        password: passwordHash,
        role: "STUDENT",
      },
    });

    // Create secondary student user for cross-user security checks
    studentUser2 = await prisma.user.create({
      data: {
        name: "Pooja Verma",
        email: "pooja.verma@example.com",
        password: passwordHash,
        role: "STUDENT",
      },
    });

    // Create administrator user
    adminUser = await prisma.user.create({
      data: {
        name: "DTE Administrator",
        email: "admin.dte@rajasthan.gov.in",
        password: passwordHash,
        role: "ADMIN",
      },
    });
  });

  after(async () => {
    // Clean up test data
    await prisma.chatMessage.deleteMany({});
    await prisma.chatSession.deleteMany({});
    await prisma.studentProfile.deleteMany({});
    await prisma.collegeCutoff.deleteMany({});
    await prisma.college.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  // ==========================================================================
  // 1. Student Profile Tests
  // ==========================================================================
  describe("Student Profile & Ownership Rules", () => {
    it("should allow a student to create and retrieve their own profile", async () => {
      const profileData = {
        fullName: "Rahul Sharma",
        phoneNumber: "9876543210",
        district: "Jaipur",
        state: "Rajasthan",
        isRajasthanDomicile: true,
        category: "OBC",
        qualifyingExam: "Class 10",
        tenthPercentage: 86.5,
        examRank: 2450,
        preferredCourse: "Civil Engineering",
        preferredLocation: "Jaipur",
        preferredCollegeType: "Government",
      };

      const created = await profileService.upsertProfile(studentUser1.id, studentUser1, profileData);
      assert.ok(created.id, "Profile ID should be generated");
      assert.strictEqual(created.userId, studentUser1.id);
      assert.strictEqual(created.category, "OBC");
      assert.strictEqual(created.examRank, 2450);

      const retrieved = await profileService.getProfile(studentUser1.id, studentUser1);
      assert.strictEqual(retrieved.fullName, "Rahul Sharma");
      assert.strictEqual(retrieved.tenthPercentage, 86.5);
    });

    it("should reject student B from viewing student A's profile (ownership check)", async () => {
      await assert.rejects(
        async () => {
          // studentUser2 attempting to view studentUser1's profile
          await profileService.getProfile(studentUser1.id, studentUser2);
        },
        (err) => {
          assert.strictEqual(err.statusCode, 403);
          assert.match(err.message, /Forbidden/i);
          return true;
        }
      );
    });

    it("should reject student B from modifying student A's profile (ownership check)", async () => {
      await assert.rejects(
        async () => {
          // studentUser2 attempting to modify studentUser1's profile
          await profileService.upsertProfile(studentUser1.id, studentUser2, {
            examRank: 1,
          });
        },
        (err) => {
          assert.strictEqual(err.statusCode, 403);
          assert.match(err.message, /Forbidden/i);
          return true;
        }
      );
    });

    it("should allow administrator to view and manage any student profile", async () => {
      const adminView = await profileService.getProfile(studentUser1.id, adminUser);
      assert.ok(adminView, "Administrator should be able to view profile");
      assert.strictEqual(adminView.userId, studentUser1.id);
    });
  });

  // ==========================================================================
  // 2. Role Permissions & Privilege Escalation Prevention
  // ==========================================================================
  describe("Role Permissions & Privilege Escalation Prevention", () => {
    it("should prevent a student from promoting themselves to ADMIN", async () => {
      await assert.rejects(
        async () => {
          // studentUser1 attempting to change their own role to ADMIN
          await profileService.updateUserRole(studentUser1.id, "ADMIN", studentUser1);
        },
        (err) => {
          assert.strictEqual(err.statusCode, 403);
          assert.match(err.message, /Only administrators can modify user roles/i);
          return true;
        }
      );

      // Verify role remains unchanged in the database
      const freshUser = await prisma.user.findUnique({ where: { id: studentUser1.id } });
      assert.strictEqual(freshUser.role, "STUDENT");
    });

    it("should allow an administrator to modify user roles", async () => {
      const updated = await profileService.updateUserRole(studentUser2.id, "ADMIN", adminUser);
      assert.strictEqual(updated.role, "ADMIN");

      // Revert studentUser2 back to STUDENT
      const reverted = await profileService.updateUserRole(studentUser2.id, "STUDENT", adminUser);
      assert.strictEqual(reverted.role, "STUDENT");
    });
  });

  // ==========================================================================
  // 3. Chat Session & Message Ownership Rules
  // ==========================================================================
  describe("Chat Session & Message Relationships", () => {
    let session1Id;

    it("should allow a student to create and view their own chat session", async () => {
      const session = await chatService.createSession(studentUser1.id, studentUser1, "Polytechnic Admissions 2024");
      assert.ok(session.id, "Session ID should be created");
      assert.strictEqual(session.userId, studentUser1.id);
      session1Id = session.id;

      const retrieved = await chatService.getSession(session1Id, studentUser1);
      assert.strictEqual(retrieved.title, "Polytechnic Admissions 2024");
    });

    it("should reject student B from viewing or accessing student A's chat session", async () => {
      await assert.rejects(
        async () => {
          // studentUser2 attempting to view studentUser1's session by ID
          await chatService.getSession(session1Id, studentUser2);
        },
        (err) => {
          assert.strictEqual(err.statusCode, 403);
          assert.match(err.message, /do not own this chat session/i);
          return true;
        }
      );
    });

    it("should store chat messages with senderType and source metadata", async () => {
      // Student message
      const studentMsg = await chatService.addMessage(session1Id, studentUser1, {
        content: "What is the cutoff for Civil Engineering at GPC Jaipur?",
        senderType: "STUDENT",
      });
      assert.strictEqual(studentMsg.senderType, "STUDENT");
      assert.strictEqual(studentMsg.sessionId, session1Id);

      // Assistant response with citation metadata
      const sources = [
        {
          document_name: "admission_guidelines_2024.pdf",
          page_number: 3,
          source_path: "/data/admission_guidelines_2024.pdf",
        },
      ];
      const assistantMsg = await chatService.addMessage(session1Id, studentUser1, {
        content: "For General category, the 2024 closing rank was 2800.",
        senderType: "ASSISTANT",
        sources: sources,
      });
      assert.strictEqual(assistantMsg.senderType, "ASSISTANT");
      assert.deepStrictEqual(assistantMsg.sources, sources);

      // Verify messages are attached to the session
      const sessionWithMsgs = await chatService.getSession(session1Id, studentUser1);
      assert.strictEqual(sessionWithMsgs.messages.length, 2);
    });

    it("should cascade delete all messages when a chat session is deleted", async () => {
      const tempSession = await chatService.createSession(studentUser1.id, studentUser1, "Temporary Query");
      await chatService.addMessage(tempSession.id, studentUser1, {
        content: "Temporary question",
        senderType: "STUDENT",
      });

      await chatService.deleteSession(tempSession.id, studentUser1);

      // Verify session and its messages are removed
      const remainingMessages = await prisma.chatMessage.findMany({
        where: { sessionId: tempSession.id },
      });
      assert.strictEqual(remainingMessages.length, 0);
    });
  });

  // ==========================================================================
  // 4. College and Cutoff Data Relationships & Restrictions
  // ==========================================================================
  describe("College & Cutoff Data Management", () => {
    let createdCollegeId;

    it("should prevent a student from creating a college record (ADMIN only)", async () => {
      await assert.rejects(
        async () => {
          await collegeService.createCollege(
            {
              code: "GPC_TEST",
              name: "Government Polytechnic College Test",
              location: "Jaipur",
            },
            studentUser1
          );
        },
        (err) => {
          assert.strictEqual(err.statusCode, 403);
          assert.match(err.message, /Only administrators can create/i);
          return true;
        }
      );
    });

    it("should allow an administrator to create a college record", async () => {
      const college = await collegeService.createCollege(
        {
          code: "GPC_JAIPUR",
          name: "Government Polytechnic College Jaipur",
          location: "Jaipur",
          district: "Jaipur",
          type: "Government",
          establishedYear: 1959,
        },
        adminUser
      );

      assert.ok(college.id);
      assert.strictEqual(college.code, "GPC_JAIPUR");
      createdCollegeId = college.id;
    });

    it("should prevent a student from adding an official cutoff record", async () => {
      await assert.rejects(
        async () => {
          await collegeService.createCutoff(
            {
              collegeId: createdCollegeId,
              courseName: "Civil Engineering",
              category: "GEN",
              admissionYear: 2024,
              openingRank: 500,
              closingRank: 2800,
              source: "Official DTE Cutoff 2024",
            },
            studentUser1
          );
        },
        (err) => {
          assert.strictEqual(err.statusCode, 403);
          assert.match(err.message, /Only administrators can add/i);
          return true;
        }
      );
    });

    it("should allow an administrator to add cutoff records and enforce uniqueness", async () => {
      const cutoff = await collegeService.createCutoff(
        {
          collegeId: createdCollegeId,
          courseName: "Civil Engineering",
          category: "GEN",
          admissionYear: 2024,
          openingRank: 500,
          closingRank: 2800,
          round: 1,
          source: "DTE Rajasthan Official Cutoff 2024",
        },
        adminUser
      );

      assert.ok(cutoff.id);
      assert.strictEqual(cutoff.closingRank, 2800);

      // Attempt duplicate insertion with identical (collegeId, courseName, category, admissionYear, round)
      await assert.rejects(
        async () => {
          await collegeService.createCutoff(
            {
              collegeId: createdCollegeId,
              courseName: "Civil Engineering",
              category: "GEN",
              admissionYear: 2024,
              openingRank: 550,
              closingRank: 2850,
              round: 1,
              source: "Duplicate Entry Attempt",
            },
            adminUser
          );
        },
        (err) => {
          // Prisma P2002 is Unique constraint failed
          assert.ok(err.code === "P2002" || err.message.includes("Unique constraint"));
          return true;
        }
      );
    });

    it("should allow students to search and read colleges and cutoffs", async () => {
      const colleges = await collegeService.listColleges({ location: "Jaipur" });
      assert.ok(colleges.length >= 1);
      assert.strictEqual(colleges[0].code, "GPC_JAIPUR");

      const cutoffs = await collegeService.getCutoffs({ courseName: "Civil Engineering" });
      assert.ok(cutoffs.length >= 1);
      assert.strictEqual(cutoffs[0].category, "GEN");
      assert.strictEqual(cutoffs[0].college.code, "GPC_JAIPUR");
    });
  });

  // ==========================================================================
  // 5. Middleware Unit Tests (requireRole & requireSelfOrAdmin)
  // ==========================================================================
  describe("Middleware Unit Verification", () => {
    it("requireRole should reject unauthenticated requests with 401", () => {
      const req = { user: null };
      let statusCode = null;
      let responseBody = null;
      const res = {
        status: (code) => {
          statusCode = code;
          return {
            json: (body) => { responseBody = body; },
          };
        },
      };

      const middleware = requireRole("ADMIN");
      middleware(req, res, () => {});

      assert.strictEqual(statusCode, 401);
      assert.strictEqual(responseBody.success, false);
    });

    it("requireRole should reject unauthorized role with 403", () => {
      const req = { user: { id: 1, role: "STUDENT" } };
      let statusCode = null;
      let responseBody = null;
      const res = {
        status: (code) => {
          statusCode = code;
          return {
            json: (body) => { responseBody = body; },
          };
        },
      };

      const middleware = requireRole("ADMIN");
      middleware(req, res, () => {});

      assert.strictEqual(statusCode, 403);
      assert.match(responseBody.message, /Forbidden/i);
    });

    it("requireRole should call next() for authorized role", () => {
      const req = { user: { id: 2, role: "ADMIN" } };
      let calledNext = false;
      const res = {};

      const middleware = requireRole("ADMIN");
      middleware(req, res, () => {
        calledNext = true;
      });

      assert.strictEqual(calledNext, true);
    });

    it("requireSelfOrAdmin should reject cross-user ID tampering with 403", () => {
      const req = {
        user: { id: 10, role: "STUDENT" },
        params: { userId: "99" }, // Attempting to tamper ID to 99
      };
      let statusCode = null;
      let responseBody = null;
      const res = {
        status: (code) => {
          statusCode = code;
          return {
            json: (body) => { responseBody = body; },
          };
        },
      };

      const middleware = requireSelfOrAdmin("userId");
      middleware(req, res, () => {});

      assert.strictEqual(statusCode, 403);
      assert.match(responseBody.message, /not authorized to access or modify records of another user/i);
    });

    it("requireSelfOrAdmin should permit owner access", () => {
      const req = {
        user: { id: 10, role: "STUDENT" },
        params: { userId: "10" },
      };
      let calledNext = false;
      const res = {};

      const middleware = requireSelfOrAdmin("userId");
      middleware(req, res, () => {
        calledNext = true;
      });

      assert.strictEqual(calledNext, true);
    });

    it("requireSelfOrAdmin should permit admin access to any user ID", () => {
      const req = {
        user: { id: 1, role: "ADMIN" },
        params: { userId: "10" },
      };
      let calledNext = false;
      const res = {};

      const middleware = requireSelfOrAdmin("userId");
      middleware(req, res, () => {
        calledNext = true;
      });

      assert.strictEqual(calledNext, true);
    });
  });
});
