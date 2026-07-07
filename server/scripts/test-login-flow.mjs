import "dotenv/config";

const base = "http://localhost:8000/api/v1";

const email = `login-test-${Date.now()}@example.com`;
const password = "TestPass123!";

const registerBody = {
  firstname: "Test",
  lastname: "User",
  middle_name: "",
  role_type: "VOLUNTEER",
  gender: "OTHER",
  age: 20,
  current_address: "Cebu",
  phone_number: `09${String(Date.now()).slice(-9)}`,
  account: { email, password },
  school_info: {
    id_number: `ID${Date.now()}`,
    graduation_year: 2026,
    graduation_month: 6,
    graduation_day: 1,
    department: { name: "CCS" },
    major: { name: "IT" },
    year_level: { name: "4th Year" },
  },
  biometric: {
    face_url: "https://example.com/face.jpg",
    embedding: Array.from({ length: 512 }, () => 0.1),
    embedding_type: "FACE",
    isActive: true,
  },
};

const registerRes = await fetch(`${base}/auth/register`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(registerBody),
});
console.log("register status:", registerRes.status);
console.log("register body:", await registerRes.text());

const loginRes = await fetch(`${base}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
console.log("login status:", loginRes.status);
console.log("login body:", await loginRes.text());
