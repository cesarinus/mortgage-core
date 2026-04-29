## Update Social Media Links

Update the placeholder URLs in `src/components/SocialIcons.tsx` with the provided NexGen Capital / Cesar A Martinez profiles.

### Change
In `SOCIAL_LINKS` constant, replace the `"#"` placeholders with real URLs:

- **LinkedIn**: Cesar A Martinez profile
- **Instagram**: Provided IG profile
- **Facebook**: Provided FB profile

### Need from you
The labels you shared ("Cesar A Martinez | LinkedIn", "(4) Instagram", "(2) Facebook") look like browser tab titles rather than URLs. Could you paste the full URLs? For example:

- LinkedIn: `https://www.linkedin.com/in/cesar-a-martinez-...`
- Instagram: `https://www.instagram.com/<handle>`
- Facebook: `https://www.facebook.com/<handle-or-page-id>`

Once you paste them, I'll drop them straight into `SOCIAL_LINKS` — no other files need to change since every social icon row across the site (footer, etc.) reads from this single constant.
