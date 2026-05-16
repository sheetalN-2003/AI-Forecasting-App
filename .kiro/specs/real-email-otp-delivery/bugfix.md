# Bugfix Requirements Document

## Introduction

The authentication system in RetailPulse AI has three flows that require email delivery of one-time codes or reset tokens: registration OTP (`/register-init`), two-factor authentication login (`/2fa/verify-login`), and password reset (`/forgot-password`). In all three flows, the codes are never actually delivered to users' email addresses. Instead, they are either printed to the server console, returned directly in API response bodies (exposing secrets to the frontend), or replaced with a hardcoded demo value. This defeats the security purpose of email verification entirely and must be corrected before the application is used in any real environment.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user submits `/register-init` with valid registration details THEN the system generates an OTP, saves it to the database, prints it to the console, and returns it in the API response body as `"code": otp_code` — exposing the secret to the frontend client

1.2 WHEN a user with 2FA enabled submits valid credentials to `/login` THEN the system prints `"123456 (Simulated)"` to the console and stores no real OTP, instead of generating and emailing a unique code to the user

1.3 WHEN a user submits `/2fa/verify-login` with the code `123456` THEN the system accepts it as valid for any 2FA-enabled account, regardless of whether a real OTP was ever generated or sent

1.4 WHEN a user submits `/forgot-password` with a registered email THEN the system calls `send_verification_email()` but that function silently falls back to `print()` when SMTP environment variables contain placeholder values, so no email is delivered

1.5 WHEN a user submits `/forgot-password` with a registered email THEN the system returns the reset token directly in the API response body as `"debug_token": reset_token` — exposing the secret to the frontend client

1.6 WHEN `send_verification_email()` is called and SMTP credentials are missing or contain placeholder values THEN the function silently returns without raising an error, making misconfiguration invisible to operators

### Expected Behavior (Correct)

#### Requirement 2.1: Registration OTP — No Secret in Response

**User Story:** As a new user registering for RetailPulse AI, I want to receive my verification code via email, so that my account security is not compromised by the code being visible in the API response.

2.1.1 WHEN a user submits `/register-init` with valid registration details (name, username, email, password meeting strength requirements, role) THEN the system SHALL generate a 6-digit numeric OTP, persist it to the `otp_verification` table with a 10-minute expiry, and send it to the provided email address via SMTP

2.1.2 WHEN the OTP email is successfully sent THEN the `/register-init` response body SHALL contain only `{"message": "Verification code sent to your email"}` with no `code`, `otp`, or any secret field

2.1.3 IF SMTP is not configured (missing, empty, or placeholder credentials) THEN the system SHALL raise an HTTP 503 error before persisting the OTP or returning any response

2.1.4 WHEN a second `/register-init` is submitted for the same email before the first OTP expires THEN the system SHALL invalidate the previous OTP and generate a new one

#### Requirement 2.2: 2FA Login — Real OTP via Email

**User Story:** As a user with 2FA enabled, I want to receive a unique one-time code to my registered email when I log in, so that my account is protected by a real second factor rather than a predictable demo code.

2.2.1 WHEN a user with 2FA enabled submits valid credentials to `/login` THEN the system SHALL generate a unique 6-digit numeric OTP, store it server-side keyed to the user (in `verification_db` or equivalent), with a 10-minute expiry

2.2.2 WHEN the 2FA OTP is generated THEN the system SHALL send it to the user's registered email address via SMTP before returning the `PENDING_2FA` response

2.2.3 IF SMTP fails during 2FA OTP delivery THEN the system SHALL return an HTTP 503 error and SHALL NOT return the `PENDING_2FA` response

#### Requirement 2.3: 2FA Verification — No Hardcoded Demo Code

**User Story:** As a security-conscious user, I want the 2FA verification to only accept the code that was sent to my email, so that the hardcoded demo bypass `123456` cannot be used to access any account.

2.3.1 WHEN a user submits `/2fa/verify-login` with a code THEN the system SHALL validate it only against the server-side stored OTP for that specific username — the hardcoded value `123456` SHALL NOT be accepted as valid under any condition

2.3.2 WHEN no server-side OTP exists for the submitted username (expired, consumed, or never generated) THEN the system SHALL return a 400 error with "Invalid 2FA code"

2.3.3 WHEN a valid OTP is successfully verified THEN the system SHALL mark it as consumed so it cannot be reused (replay attack prevention)

2.3.4 WHEN a submitted OTP has passed its 10-minute expiry THEN the system SHALL return a 400 error with "Invalid 2FA code" and SHALL NOT issue an access token

#### Requirement 2.4: Forgot Password — No Token in Response

**User Story:** As a user resetting my password, I want the reset link sent only to my email, so that the reset token is not exposed in the API response where it could be intercepted.

2.4.1 WHEN a user submits `/forgot-password` with a registered email THEN the system SHALL generate a secure reset token, store it server-side with a 60-minute expiry, and send the reset link exclusively to the user's email via SMTP

2.4.2 WHEN the reset email is successfully sent THEN the response body SHALL contain only `{"message": "Reset link sent to your email"}` — no `debug_token`, `token`, `reset_link`, or any secret field

2.4.3 WHEN a user submits `/forgot-password` with an email not in the database THEN the system SHALL return `{"message": "If the email exists, a reset link has been sent"}` without revealing account existence (unchanged behavior preserved)

2.4.4 IF SMTP fails during reset email delivery THEN the system SHALL return an HTTP 503 error and SHALL NOT persist the reset token

#### Requirement 2.5: SMTP Misconfiguration — Visible Error

**User Story:** As a system operator, I want SMTP misconfiguration to surface as an immediate visible error, so that I know when email delivery is broken rather than silently failing.

2.5.1 IF any of the four required SMTP fields (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`) is missing, empty string, or matches a placeholder pattern (`your-email@gmail.com`, `your-app-password`, `localhost`) THEN the email sending function SHALL raise an HTTP 503 error with a message indicating SMTP misconfiguration, before sending the email or persisting any side effects

#### Requirement 2.6: Email Format — Clear and Human-Readable

**User Story:** As a user receiving a verification code or reset link, I want the email to be clearly formatted with a descriptive subject and prominent display of the code or link, so that I can easily find and use it.

2.6.1 WHEN an OTP email is sent THEN the subject SHALL contain "verification" or "code" (case-insensitive) and the OTP SHALL appear on a standalone line separated by blank lines in the email body

2.6.2 WHEN a password reset email is sent THEN the subject SHALL contain "password" and "reset" (case-insensitive) and the reset link SHALL appear as a clickable hyperlink on a standalone line in the email body

2.6.3 WHEN either email type is sent THEN the body SHALL state the expiry duration in minutes (e.g., "This code expires in 10 minutes")

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user submits `/verify-registration` with a valid, unexpired OTP that was sent to their email THEN the system SHALL CONTINUE TO verify the OTP against the database record and create the user account on success

3.2 WHEN a user submits `/verify-registration` with an invalid or expired OTP THEN the system SHALL CONTINUE TO return a 400 error with the message "Invalid or expired verification code"

3.3 WHEN a user submits `/2fa/verify-login` with a correct OTP THEN the system SHALL CONTINUE TO issue a valid JWT access token and return the authenticated user object

3.4 WHEN a user submits `/2fa/verify-login` with an incorrect OTP THEN the system SHALL CONTINUE TO return a 400 error with the message "Invalid 2FA code"

3.5 WHEN a user submits `/reset-password` with a valid reset token and a strong new password THEN the system SHALL CONTINUE TO update the user's hashed password and invalidate the used token

3.6 WHEN a user submits `/reset-password` with an invalid or already-used token THEN the system SHALL CONTINUE TO return a 400 error with the message "Invalid or expired reset token"

3.7 WHEN a user submits `/forgot-password` with an email address that does not exist in the database THEN the system SHALL CONTINUE TO return the generic message "If the email exists, a reset link has been sent" without revealing whether the account exists

3.8 WHEN SMTP is correctly configured and operational THEN the system SHALL CONTINUE TO successfully deliver emails for all three flows (registration OTP, 2FA OTP, password reset)

---

## Gmail App Password Setup Guide

To use Gmail as the SMTP provider for this application:

1. **Enable 2-Step Verification** on your Google account at https://myaccount.google.com/security
2. **Generate an App Password**: Go to https://myaccount.google.com/apppasswords → Select app: "Mail" → Select device: "Other" → Enter "RetailPulse AI" → Click Generate
3. **Copy the 16-character password** shown (spaces are optional, remove them)
4. **Update `.env`** with your real credentials:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-actual-gmail@gmail.com
   SMTP_PASSWORD=xxxx xxxx xxxx xxxx   # the 16-char app password
   MAIL_FROM=your-actual-gmail@gmail.com
   ```
5. **Restart the backend** after updating `.env`

Note: Regular Gmail passwords will NOT work — you must use an App Password. If your Google account uses Google Workspace, contact your admin to enable App Passwords.
