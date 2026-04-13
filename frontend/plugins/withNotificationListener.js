const { withAndroidManifest } = require('@expo/config-plugins');

const withNotificationListener = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults.manifest;
    const application = androidManifest.application[0];

    // Add the NotificationListenerService
    if (!application.service) {
      application.service = [];
    }

    // Check if the service is already added
    const serviceName = 'com.lesimoes.androidnotificationlistener.RNAndroidNotificationListener';
    const hasService = application.service.some(
      (s) => s.$['android:name'] === serviceName
    );

    if (!hasService) {
      // Add tools namespace to manifest
      androidManifest.$ = {
        ...androidManifest.$,
        'xmlns:tools': 'http://schemas.android.com/tools',
      };

      // Add tools:replace to application
      application.$ = {
        ...application.$,
        'tools:replace': 'android:allowBackup',
      };

      application.service.push({
        $: {
          'android:name': serviceName,
          'android:permission': 'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'android.service.notification.NotificationListenerService' } },
            ],
          },
        ],
      });
    }

    return config;
  });
};

module.exports = withNotificationListener;
