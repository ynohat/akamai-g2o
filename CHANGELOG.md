Changelog
=========

## 2.0.0

### Remove Strict

Removed the strict option, and replaced with `onUnauthenticated` hook.

This update allows the calling application to implement additional functionality
when a request is found to be unauthenticated.  The examples shows:

- logging
- different status code
- reimplement strict

## 1.0.0

Initial release.
