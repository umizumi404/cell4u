# SECRETS_REMEDIATION.md — do this BEFORE Ticket 1 (manual, human-owned)

The Ticket 0 map found a committed `.env` with live keys and a stray `Untitled` file with
leaked Supabase creds. A coding agent **cannot** fix this for you — removing files from git
history and rotating keys are human actions. Treat these keys as compromised the moment they
hit a remote.

## 1. Rotate every leaked credential (do this first — they're already exposed)
- Google Maps API key
- Supabase: publishable/anon key **and** service-role key (regenerate; the service-role key is god-mode)
- ElevenLabs API key
- Twilio: auth token (regenerate) + note the account SID/phone exposure

Most of these are old-stack and about to be deleted anyway — but rotate them regardless,
because the secret is public in history until you scrub it.

## 2. Remove the secrets from the working tree
```
git rm --cached .env Untitled
echo ".env" >> .gitignore        # confirm .env* is ignored
git commit -m "chore: remove committed secrets from tree"
```
This stops *future* tracking but does NOT erase history.

## 3. Scrub them from git history
Use git-filter-repo (preferred) or BFG:
```
# install git-filter-repo, then from a fresh clone:
git filter-repo --invert-paths --path .env --path Untitled
# OR with BFG:
# bfg --delete-files .env --delete-files Untitled
git push --force --all
git push --force --tags
```
Coordinate the force-push with anyone else on the repo (everyone re-clones afterward).

## 4. Verify
```
git log --all --full-history -- .env Untitled   # should return nothing
```

Only after keys are rotated and history is clean should you start Ticket 1.
