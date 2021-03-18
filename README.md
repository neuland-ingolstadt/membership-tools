# Tools
Internal tools for member management

## Creating LDAP accounts

1. Create a `.env` file with the LDAP server settings:
```
SERVER=ldap://127.0.0.1:3389
BIND_CN=cn=admin,dc=informatik,dc=sexy
BIND_PASSWORD=redacted
USER_CN=ou=users,dc=informatik,dc=sexy
```

2. Run `node create-ldap-user.js`
