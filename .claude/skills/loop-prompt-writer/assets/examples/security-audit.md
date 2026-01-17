---
model: sonnet
max_iterations: 100
completion_promise: AUDIT COMPLETE
commit_required: true
knowledge_dir: .project
project_type: security
---

# PaymentService: Security Code Audit

**ENDLESS ITERATIVE BUILD.** Each iteration:
- READ `.project/` first - understand state and learnings
- DON'T recreate existing work - build on it
- LEARN from successes and failures
- COMMIT before ending - no commit = incomplete

---

## The Goal

Comprehensive security audit of the PaymentService codebase to identify and fix vulnerabilities before production deployment.

**Target**: Zero critical/high vulnerabilities, all OWASP Top 10 addressed.

---

## Scope

| In Scope | Out of Scope |
|----------|--------------|
| All source code in /src | Third-party libraries (separate audit) |
| Configuration files | Infrastructure/deployment |
| API endpoints | Client applications |
| Database queries | Network architecture |

---

## Methodology

1. **Static Analysis** - Automated scanning with Semgrep, CodeQL
2. **Manual Review** - Focus on auth, payment, and data handling
3. **Dependency Check** - Known CVEs in dependencies
4. **Configuration Review** - Secrets, permissions, defaults
5. **Documentation** - Findings with remediation guidance

---

## Review Areas

| Area | Priority | Focus |
|------|----------|-------|
| Authentication | Critical | Token handling, session management |
| Authorization | Critical | Access control, privilege escalation |
| Input Validation | High | SQL injection, XSS, command injection |
| Data Protection | High | Encryption, PII handling, logging |
| Error Handling | Medium | Information leakage, stack traces |

---

## Severity Ratings

| Rating | Description | SLA |
|--------|-------------|-----|
| Critical | Direct data breach or system compromise | Fix before deploy |
| High | Significant security weakness | Fix within 7 days |
| Medium | Defense-in-depth issue | Fix within 30 days |
| Low | Best practice improvement | Track for future |

---

## Priority

1. **Auth flows** - Login, registration, password reset
2. **Payment handling** - Card data, transactions
3. **API security** - Input validation, rate limiting
4. **Data storage** - Encryption, access controls
5. **Report** - Final deliverable with remediation

---

## Success Criteria

- [ ] All critical paths manually reviewed
- [ ] Static analysis clean (no high/critical)
- [ ] No hardcoded secrets found
- [ ] All findings documented with remediation
- [ ] Security report delivered

---

## Completion

Output when ALL criteria met:

<promise>AUDIT COMPLETE</promise>
