const skillMap = {
    all: 'all',
    firstaid: 'Basic First Aid / CPR',
    medical: 'Medical Professional',
    psych: 'Psychological First Aid',
    relief: 'Relief Goods Packing',
    debris: 'Debris Clearing & Heavy Lifting',
    driver: 'Driver (4-Wheel / Truck / Van)',
    boat: 'Boat / Bangka Operator'
};

function setVolTab(btn) {
    document.querySelectorAll('#vol-filter-row .vfilter-btn')
        .forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    activeSkillFilter = skillMap[btn.dataset.key] || 'all';
    filterVolunteers();
}
