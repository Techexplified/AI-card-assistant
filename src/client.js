/* global window */

window.TrelloPowerUp.initialize({
  'card-badges': function (t, options) {
    return [
      {
        text: 'Hello',
        color: 'green',
      },
    ];
  },
  'board-buttons': function (t, options) {
    return [
      {
        icon: {
          dark: 'https://cdn.glitch.com/1b42d7de-6e4f-499f-9762-3c583d7f6fa5%2Ficon-dark.png?1504104006241',
          light: 'https://cdn.glitch.com/1b42d7de-6e4f-499f-9762-3c583d7f6fa5%2Ficon-light.png?1504104006326',
        },
        text: 'Test Button',
        callback: function (t) {
          return t.alert({
            message: 'Hello from your Trello Power-Up!',
            duration: 5,
          });
        },
      },
    ];
  },
});
