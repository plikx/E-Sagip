function printVol() {
  const search = document.querySelector('.vol-search-wrap');
  const filterRow = document.querySelector('.vol-filter-row');
  const volCount = document.querySelector('.vol-count');


  // Hide before printing
  volCount.style.display = 'none';
  search.style.display = 'none';
  filterRow.style.display = 'none';

  const content = document.querySelector('.print-vol').innerHTML;
  const original = document.body.innerHTML;

  document.body.innerHTML = content;
  window.print();

  setTimeout(() => {
    document.body.innerHTML = original;
    location.reload();
  }, 1000);
}

function printAdmin() {
  const search = document.querySelector('.ad-search-wrap');
  const volCount = document.querySelector('.ad-count');
  const adBtn = document.querySelector('.admin-add-btn')

  volCount.style.display = 'none';
  search.style.display = 'none';
  adBtn.style.display = 'none';

  const content = document.querySelector('.print-admin').innerHTML;
  const original = document.body.innerHTML;

  document.body.innerHTML = content;
  window.print();

  setTimeout(() => {
    document.body.innerHTML = original;
    location.reload();
  }, 1000);
}
