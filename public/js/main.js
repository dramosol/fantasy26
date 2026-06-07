(function() {
  "use strict";

  // Table sort
  var table = document.getElementById("standingsTable");
  if (table) {
    var sortDir = {};
    table.querySelectorAll("th.sortable").forEach(function(th, idx) {
      th.addEventListener("click", function() {
        sortDir[idx] = !sortDir[idx];
        var tbody = table.querySelector("tbody");
        var rows = Array.from(tbody.querySelectorAll("tr"));
        rows.sort(function(a, b) {
          var va = a.cells[idx] ? a.cells[idx].textContent.trim() : "";
          var vb = b.cells[idx] ? b.cells[idx].textContent.trim() : "";
          var na = parseFloat(va), nb = parseFloat(vb);
          var isNum = !isNaN(na) && !isNaN(nb);
          var cmp = isNum ? na - nb : va.localeCompare(vb);
          return sortDir[idx] ? cmp : -cmp;
        });
        rows.forEach(function(r) { tbody.appendChild(r); });
      });
    });
  }

  // Table search
  var searchInput = document.getElementById("tableSearch");
  if (searchInput && table) {
    searchInput.addEventListener("input", function() {
      var q = this.value.toLowerCase();
      var tbody = table.querySelector("tbody");
      Array.from(tbody.querySelectorAll("tr")).forEach(function(row) {
        row.style.display = row.textContent.toLowerCase().includes(q) ? "" : "none";
      });
    });
  }
}());
