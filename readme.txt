Croma Stock Signal

This is a separate installable PWA. It can be deployed to Render as a Node web
service or to Vercel. Open the HTTPS URL on your phone and use Install/Add to
Home Screen.

Render deployment uses `npm start` and the included `server.js` wrapper. The
`/health` endpoint is used by Render for health checks. While the page is open,
the frontend sends a lightweight keep-alive request every 15 seconds; browser
background suspension and Render's free-tier sleep policy can still pause it.

Price alerts

Every stock job also reads Croma's current selling price for that product and
pincode. The browser saves the first successful value as the baseline. A later
price hike or decrease is shown in the Price Change Alerts card and starts the
ringtone. A price hike temporarily holds that product's stock signal until the
user presses "OK, I KNOW - Restart checking". The button stops the ringtone,
releases the hold and continues stock and price checks. Price decreases stay
visible with the stock signal.

Transient API errors do not clear the last known stock result. The app shows an
API error status, waits 10 seconds, and retries the stock and price scan.

The app stores the watchlist, filters and latest results in the browser's local
storage. The included serverless route is required because Croma's API does not
allow direct browser requests from a static page. Keep the route folder named
api in lowercase for Vercel; the app also falls back to API/stock for older
deployments that used an uppercase API folder.

The watch loop continues while the browser/installed app is allowed to run in
the background. If the phone suspends the app, it immediately catches up when
you return; guaranteed checks while the app is fully suspended require a
server-side scheduler or native background service.

Device access

The app creates a persistent installation Device ID; it cannot read a phone's
IMEI or hardware serial. Open the app once, copy the Device ID, and add it to
private/licenses.json before redeploying:

{
  "devices": [
    "BUYER_DEVICE_ID_1",
    "BUYER_DEVICE_ID_2",
    "BUYER_DEVICE_ID_3"
  ]
}

Add up to 50 IDs in the same list. Remove an entry to revoke access, then
redeploy. If the buyer clears app/browser data, a new Device ID is generated
and must be added.
The stock API checks the allowlist too, so an unapproved device cannot simply
skip the lock screen. An open app rechecks access every 30 seconds, and an
active stock scan locks immediately when the API returns a revoked-device response.
