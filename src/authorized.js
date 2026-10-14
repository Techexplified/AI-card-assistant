/* global window, document */
(function () {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (window.opener) {
    window.opener.postMessage(
      {
        type: 'TRELLO_AUTH_CODE',
        code: code,
      },
      window.location.origin
    );
  }
  window.close();
})();
