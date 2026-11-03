# Security

## Reporting a vulnerability

Email **info@zeepler.com** with "Security" in the subject. Please do not open a public issue for
a vulnerability.

Include what you found, how to reproduce it, and what it lets someone do. You will get a reply
within 2 business days.

This covers this repository's code. A vulnerability in the zeepler API or website goes to the
same address.

## Scope

This app keeps the user's API key in browser storage, which any JavaScript on the same page can
read. That is documented in the README's Security section, and it is not a vulnerability in
itself. A way to run script on the page, or to send the key anywhere but the configured API, is.
