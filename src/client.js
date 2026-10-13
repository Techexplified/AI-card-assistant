/* global window */
import { TRELLO_APP_KEY, TRELLO_APP_NAME, TRELLO_APP_AUTHOR } from './config.js';

const getIconUrl = () => {
  if (typeof window !== 'undefined' && window.TrelloPowerUp?.util?.relativeUrl) {
    return window.TrelloPowerUp.util.relativeUrl('./assistant.png');
  }
  return new URL('./assistant.png', window.location.href).href;
};

window.TrelloPowerUp.initialize(
  {
    'card-badges': function (t, options) {
      return [
        {
          text: 'Hello',
          color: 'green',
        },
      ];
    },
    'board-buttons': function (t, options) {
      const iconUrl = getIconUrl();
      return [
        {
          icon: {
            dark: iconUrl,
            light: iconUrl,
          },
          text: 'AI card assistant',
          callback: function (t) {
            return t.alert({
              message: 'Hello from AI Card Assistant!',
              duration: 5,
            });
          },
        },
      ];
    },
    'card-back-section': function (t, options) {
      return {
        title: 'AI Assistant',
        icon: getIconUrl(),
        content: {
          type: 'iframe',
          url: t.signUrl('./section.html'),
          height: 220,
        },
      };
    },
  },
  {
    appKey: TRELLO_APP_KEY,
    appName: TRELLO_APP_NAME,
    appAuthor: TRELLO_APP_AUTHOR,
  }
);
