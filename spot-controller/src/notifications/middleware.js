import { MiddlewareRegistry } from 'jitsi-meet-redux';
import PushNotification from 'react-native-push-notification';

import { APP_MOUNTED } from '../app';
import { logger } from '../logger';

import { CANCEL_LOCAL_NOTIFICATION, SEND_LOCAL_NOTIFICATION } from './actionTypes';
import { notificationReceived } from './actions';

/**
 * The redux middleware for the beacons feature.
 *
 * NOTE: Some platforms are not supported at the moment, so we just skip
 * registering the middelware in those cases.
 *
 * @param {Store} store - The redux store.
 * @returns {Function}
 */
MiddlewareRegistry.register(store => next => action => {
    switch (action.type) {
    case APP_MOUNTED:
        _configurePushNotifications(store);
        break;
    case CANCEL_LOCAL_NOTIFICATION:
        _cancelLocalNotification(action.id);
        break;
    case SEND_LOCAL_NOTIFICATION:
        _sendLocalNotification(action.id, action.title, action.text);
        break;
    }

    // We need to execute this middleware first, and make sure all other middlewares that
    // use notifications are executed later (e.g. beacons).
    return next(action);
});

/**
 * Cancels a local notification.
 *
 * @param {string} id - The ID of the notification.
 * @returns {void}
 */
function _cancelLocalNotification(id) {
    PushNotification.cancelLocalNotifications({ id });
}

/**
 * Configures push notifications when the app starts.
 *
 * @returns {void}
 */
function _configurePushNotifications({ dispatch }) {
    PushNotification.configure({

        // (required) Called when a remote or local notification is opened or received
        onNotification: notification => {
            if (notification.userInteraction) {
                logger.info('Notification received', notification);
                dispatch(notificationReceived((notification.data || notification.userInfo).id));
                notification.finish();
            } else {
                logger.warn('Skipping non user interaction notification.');
            }
        },

        // iOS permissions to register.
        permissions: {
            alert: true,
            sound: true
        },

        popInitialNotification: true,
        requestPermissions: true
    });
}

/**
 * Sends (or updates) a local push notification.
 *
 * @param {string} id - The ID of the notification.
 * @param {string} title - The notification title.
 * @param {string} text - The notification text (content).
 * @returns {void}
 */
function _sendLocalNotification(id, title, text) {
    logger.info('Sending notification', id, title, text);

    // Cancels the previous one, if any
    _cancelLocalNotification(id);

    // Sends a new, updated one
    PushNotification.localNotification({
        autoCancel: true,
        bigText: text,
        id,
        message: text,
        ongoing: false,
        ticker: title,
        title,
        userInfo: {
            id
        },
        actions: '["Open"]'
    });
}
