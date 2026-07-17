# Background images

Drop your café photos in this folder (e.g. `bg-week1.jpg`), commit + push, and
Netlify will redeploy automatically. Then set the `backgroundImage` field on
the `current-event` document in Firestore to a path like:

```
/assets/images/bg-week1.jpg
```

You can also point `backgroundImage` at any image hosted elsewhere (e.g. a
direct image URL from Google Photos, Imgur, etc.) — no redeploy needed in
that case, just update the Firestore field.
