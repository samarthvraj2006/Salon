const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'apps', 'mobile', 'assets');
fs.mkdirSync(dir, { recursive: true });
// 1x1 PNG (green-ish)
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);
for (const name of ['icon.png', 'splash.png', 'adaptive-icon.png', 'favicon.png']) {
  fs.writeFileSync(path.join(dir, name), png);
}
fs.writeFileSync(
  path.join(__dirname, 'apps', 'mobile', 'google-services.json'),
  JSON.stringify(
    {
      project_info: { project_number: '000000000000', project_id: 'salonslot-demo' },
      client: [{ client_info: { mobilesdk_app_id: '1:000:android:demo', android_client_info: { package_name: 'app.salonslot.customer' } }, api_key: [{ current_key: 'REPLACE_ME' }] }],
    },
    null,
    2,
  ),
);
console.log('assets ok');
