(() => {
  if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) return;
  const box = document.createElement('details');
  box.className = 'notice';
  box.style.margin = '16px 0';
  const title = document.createElement('summary');
  title.textContent = 'Klar als App auf deinem iPhone nutzen';
  title.style.cursor = 'pointer';
  const text = document.createElement('p');
  text.textContent = 'Öffne diese Adresse auf deinem iPhone in Safari. Tippe auf Teilen → Zum Home-Bildschirm → Hinzufügen. Danach startest du Klar über das App-Symbol.';
  const note = document.createElement('p');
  note.textContent = 'Zum Laden benötigst du Internet. Deine lokal gespeicherten Daten werden dabei nicht automatisch vom Mac übernommen. Die Cloud-Verbindung und die Einrichtung von Erinnerungen findest du in den Einstellungen.';
  box.append(title, text, note);
  document.querySelector('main').append(box);
})();
