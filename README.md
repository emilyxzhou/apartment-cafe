# Apartment Café

A one-page site for a small apartment café: this week's menu, the next gathering's date/time, and a sign-up form capped at a set number of guests.

- **Hosting:** [Netlify](https://netlify.com) (free plan)
- **Data:** [Firebase Firestore](https://firebase.google.com) (free "Spark" plan)
- **No build step:** plain HTML/CSS/JS — Firebase is loaded straight from its CDN.

## 1. Preview it locally

No build tools needed, but the page must be served over HTTP (not opened as a `file://` URL) for the JS module imports to work.

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`. The menu/date will show an error until you finish the Firebase setup below.

## 2. Set up Firebase (free, no credit card)

1. Go to the [Firebase Console](https://console.firebase.google.com/), click **Add project**, and create a new project (any name is fine). Decline Google Analytics if you don't want it — not needed here.
2. In the left sidebar, go to **Build → Firestore Database**, click **Create database**, choose a region close to you, and start in **production mode**.
3. Go to the **Rules** tab of Firestore and replace the contents with everything in [`firestore.rules`](firestore.rules) from this repo, then click **Publish**.
   - *(Optional, if you install the [Firebase CLI](https://firebase.google.com/docs/cli) later: `firebase deploy --only firestore:rules` does this from the terminal instead.)*
4. Create the one event document the site reads from:
   - In Firestore, click **Start collection** → collection ID `events`.
   - For the document ID, type exactly `current-event`.
   - Add these fields (use the **+ Add field** button, matching these types):

     | Field | Type | Example |
     |---|---|---|
     | `title` | string | `Matcha & Mochi Night` |
     | `tagline` | string | `A quiet Sunday with tea and mochi` |
     | `dateTime` | timestamp | pick a date/time in the picker |
     | `capacity` | number | `8` |
     | `signupCount` | number | `0` |
     | `backgroundImage` | string | `/assets/images/bg-week1.jpg` (optional) |
     | `menu` | array | see below |

   - For `menu`, add an array field where each item is a **map** with these string sub-fields: `category`, `name`, `price`, `description`. For example:
     ```
     menu: [
       { category: "Coffee", name: "Espresso", price: "$3.00", description: "Sharp and bold." },
       { category: "Coffee", name: "Latte", price: "$4.50", description: "Creamy and smooth." },
       { category: "Pastry", name: "Croissant", price: "$3.50", description: "Buttery, flaky layers." }
     ]
     ```
5. Get your web app config:
   - Click the gear icon → **Project settings** → scroll to **Your apps** → click the **</>** (web) icon → register an app (nickname can be anything, no need for Firebase Hosting).
   - Copy the `firebaseConfig` object it gives you.
6. Paste those values into [`js/firebase-config.js`](js/firebase-config.js) in this repo, replacing the placeholders.

You now have a live Firestore database the site can read from, and a signups collection will be created automatically the first time someone signs up.

## 3. Deploy to Netlify (free)

**Recommended: connect GitHub for auto-deploy on every push**

1. Push this project to a new GitHub repo (`git init`, `git add .`, `git commit`, then create a repo on GitHub and push).
2. Go to [app.netlify.com](https://app.netlify.com), **Add new site → Import an existing project**, and pick your GitHub repo.
3. Leave the build command empty and set the publish directory to `.` (this repo already includes `netlify.toml` with this configured).
4. Click **Deploy**. Netlify will give you a free `*.netlify.app` URL immediately, and will redeploy automatically every time you push to GitHub.

**Alternative: no Git required**

Go to [app.netlify.com/drop](https://app.netlify.com/drop) and drag the whole project folder onto the page. This deploys instantly but won't auto-update — you'd re-drag the folder each time you change site code (not needed for weekly menu/date updates, since those live in Firestore).

## 4. Weekly update workflow

Once it's set up, updating the site for a new week takes no code changes and no redeploy:

1. Open the `current-event` document in the Firestore Console.
2. Edit `menu`, `dateTime`, `capacity`, `title`, `tagline`, and/or `backgroundImage` as needed.
3. **Reset `signupCount` back to `0`** so the new week starts with a fresh capacity count.
4. Refresh the live site to confirm it looks right.

To see who signed up, open the `signups` collection in the Firestore Console — each entry includes the guest's name, email, and a snapshot of which event/date they signed up for.

## Notes & limitations

- **Capacity enforcement:** the sign-up form uses a Firestore transaction plus security rules (see [`firestore.rules`](firestore.rules)) so two people submitting at the same instant can't both grab the last spot — this is enforced by Firestore itself, not just the browser.
- **No login/auth:** anyone with the link can view the menu and sign up. The `signups` collection is locked down so the public can create entries but never read, edit, or delete them — only you (via the Firebase Console) can see the guest list.
- **Free tier limits:** Firestore's free quota (50K reads/20K writes per day, 1 GiB storage) and Netlify's free quota (300 credits/month) are both far beyond what an 8-10 person weekly signup will ever use.
