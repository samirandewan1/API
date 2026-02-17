# Admin API — Node.js + Express + MongoDB + Joi

Complete conversion of the PHP admin backend into a single Node.js project.

---

## Project Structure

```
nodejs-admin-api/
├── config/
│   └── db.js                    # MongoDB connection (Mongoose)
├── src/
│   ├── app.js                   # Express entry point
│   ├── middleware/
│   │   └── auth.js              # JWT admin auth middleware
│   ├── validators/
│   │   └── index.js             # All Joi validation schemas
│   ├── utils/
│   │   ├── crypto.js            # AES-128-CBC encrypt/decrypt (matches PHP openssl)
│   │   ├── token.js             # JWT generate / decode
│   │   └── helpers.js           # genRandomTracker, orgUsersActionLog, parseBool
│   ├── controllers/
│   │   ├── auth.controller.js         # Admin login
│   │   ├── organization.controller.js # Org CRUD + dashboard
│   │   ├── user.controller.js         # Org-user CRUD + password
│   │   └── tracker.controller.js      # Tracker CRUD
│   └── routes/
│       └── index.js             # All route definitions
├── .env.example
└── package.json
```

---

## PHP → Node.js File Mapping

| PHP File                     | Node.js Route                     | Controller                        |
|------------------------------|-----------------------------------|-----------------------------------|
| adminauthentication.php      | POST /api/admin/login             | auth.controller.js                |
| create.php                   | POST /api/organization/create     | organization.controller.js        |
| edit.php                     | POST /api/organization/edit       | organization.controller.js        |
| orgdelete.php                | POST /api/organization/delete     | organization.controller.js        |
| view.php                     | POST /api/organization/view       | organization.controller.js        |
| admin_dashboardcounts.php    | POST /api/organization/dashboard  | organization.controller.js        |
| newuser.php                  | POST /api/users/create            | user.controller.js                |
| updateuser.php               | POST /api/users/update            | user.controller.js                |
| deleteuser.php               | POST /api/users/delete            | user.controller.js                |
| viewusers.php                | POST /api/users/view              | user.controller.js                |
| orgadmin_updatepassword.php  | POST /api/users/update-password   | user.controller.js                |
| newtracker.php               | POST /api/trackers/create         | tracker.controller.js             |
| updatetracker.php            | POST /api/trackers/update         | tracker.controller.js             |
| deletetracker.php            | POST /api/trackers/delete         | tracker.controller.js             |
| removeTracker.php            | POST /api/trackers/remove         | tracker.controller.js             |
| viewtrackers.php             | POST /api/trackers/view           | tracker.controller.js             |

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy and configure environment
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, and AES keys

# 3. Start
npm start

# Development (with auto-restart)
npm run dev
```

---

## Environment Variables

| Variable         | Description                              | Default                |
|------------------|------------------------------------------|------------------------|
| PORT             | HTTP port                                | 3000                   |
| MONGODB_URI      | MongoDB connection string                | mongodb://localhost/admin_db |
| JWT_SECRET       | Secret for signing JWT tokens            | (required)             |
| AES_SECRET_KEY   | 16-byte key for AES-128 encryption       | (required)             |
| AES_IV           | 16-byte IV for AES-128                   | (required)             |

---

## API Reference

All endpoints use `POST` with a JSON body in the shape:

```json
{
  "data": {
    "key": "<jwt_token>",
    "form": { ... },
    "filter": { ... },
    "extra": { "pageIndex": 0, "pageJump": 0, "orderByDateCreated": "-1" }
  }
}
```

### Auth
| Method | Route              | Body `form` fields            |
|--------|--------------------|-------------------------------|
| POST   | /api/admin/login   | loginname, password           |

### Organizations
| Method | Route                         | Notes                         |
|--------|-------------------------------|-------------------------------|
| POST   | /api/organization/create      | Requires JWT (admin)          |
| POST   | /api/organization/edit        | filter.organizationId required|
| POST   | /api/organization/delete      | form.orgId required           |
| POST   | /api/organization/view        | Optional filter fields        |
| POST   | /api/organization/dashboard   | Requires accountType=admin    |

### Users
| Method | Route                         | Notes                         |
|--------|-------------------------------|-------------------------------|
| POST   | /api/users/create             | Requires accountType=admin    |
| POST   | /api/users/update             | filter.userId + organizationId|
| POST   | /api/users/delete             | form.userId + organizationId  |
| POST   | /api/users/view               | filter.organizationId required|
| POST   | /api/users/update-password    | form.userId + organizationId  |

### Trackers
| Method | Route                         | Notes                         |
|--------|-------------------------------|-------------------------------|
| POST   | /api/trackers/create          | Requires accountType=admin    |
| POST   | /api/trackers/update          | form.organizationId + trackerId|
| POST   | /api/trackers/delete          | Soft-delete (status=hold)     |
| POST   | /api/trackers/remove          | Hard-delete                   |
| POST   | /api/trackers/view            | filter.organizationId required|

---

## Error Codes (preserved from PHP)

| Code  | Meaning                              |
|-------|--------------------------------------|
| SCB1  | Key (token) missing                  |
| SCB2  | Token expired                        |
| SCB3  | Authentication failed                |
| SCB4  | Empty / invalid credentials          |
| SCB5  | Missing organizationId or trackerId  |
| SCB6  | Organization not found               |
| SCB7  | Record not found                     |
| SCB8  | Missing required filter fields       |
| SCB9  | IMEI already in use                  |
| SCB10 | Tracker already exists               |
| SCB11 | Login name already in use            |
| SCB12 | Organization ID required             |
| SCB67 | Email already in use                 |
| SCB78 | Organization name already exists     |

---

## Validation (Joi)

All Joi schemas are in `src/validators/index.js`. Key rules:

- `name`, `category`, `address`, `area`, `city`, `state`, `country`, `status` are **required** for org creation.
- `email` is validated with RFC-compliant format check.
- `password` minimum length is **4** characters.
- `gender` must be one of `male | female | other`.
- `status` must be `active | hold`.
- `campaignType` must be `sms | broadcast | both`.
- Boolean alert fields (`smsAlert`, `appAlert`, etc.) accept the string `'true'` or `'false'`.
- Tracker `imei` and `boxid` are required on create; all fields are optional on update.
