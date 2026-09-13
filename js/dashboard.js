window.updateDashboardCounts = function() {
  let scooty = 0, bike = 0, cycle = 0;
  customerDataList.forEach(c => {
    let v = String(c["Vehicle"] || "").trim().toLowerCase();
    if (v === "scooty") scooty++; 
    else if (v === "bike") bike++; 
    else if (v === "cycle") cycle++;
  });
  
  if (document.getElementById("count-total")) document.getElementById("count-total").innerText = customerDataList.length;
  if (document.getElementById("count-scooty")) document.getElementById("count-scooty").innerText = scooty;
  if (document.getElementById("count-bike")) document.getElementById("count-bike").innerText = bike;
  if (document.getElementById("count-cycle")) document.getElementById("count-cycle").innerText = cycle;

  let todaySales = 0, monthSales = 0;
  const d = new Date();
  const tY = d.getFullYear(), tM = d.getMonth(), tD = d.getDate();

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const tDayStr1 = `${String(tD).padStart(2,'0')}-${String(tM+1).padStart(2,'0')}-${tY}`;
  const tDayStr2 = `${String(tD).padStart(2,'0')} ${monthNames[tM]} ${tY}`;
  const tMonStr1 = `-${String(tM+1).padStart(2,'0')}-${tY}`;
  const tMonStr2 = `${monthNames[tM]} ${tY}`;

  billDataList.forEach(b => {
    const amt = parseAmount(b["Total Amount"]);
    let rawDate = String(b["Date"] || "").trim();
    let isToday = false, isMonth = false;

    if (rawDate === tDayStr1 || rawDate === tDayStr2) isToday = true;
    if (rawDate.includes(tMonStr1) || rawDate.includes(tMonStr2)) isMonth = true;

    if (!isToday || !isMonth) {
      const parsedDate = parseCustomDate(rawDate);
      if (parsedDate && !isNaN(parsedDate.getTime())) {
        if (parsedDate.getFullYear() === tY && parsedDate.getMonth() === tM && parsedDate.getDate() === tD) isToday = true;
        if (parsedDate.getFullYear() === tY && parsedDate.getMonth() === tM) isMonth = true;
      }
    }
    if (isToday) todaySales += amt;
    if (isMonth) monthSales += amt;
  });

  if(document.getElementById("sales-today")) document.getElementById("sales-today").innerText = todaySales.toFixed(2);
  if(document.getElementById("sales-month")) document.getElementById("sales-month").innerText = monthSales.toFixed(2);
  renderDashboardCharts(scooty, bike, cycle, monthSales);
};

window.renderDashboardCharts = function(scooty, bike, cycle, monthSales) {
  const ctxToday = document.getElementById('todaySalesChart');
  if (ctxToday) {
    if (todaySalesChartInst) todaySalesChartInst.destroy();
    todaySalesChartInst = new Chart(ctxToday.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['Scooty', 'Bike', 'Cycle'],
        datasets: [{ data: [scooty, bike, cycle], backgroundColor: ['#eab308', '#10b981', '#ef4444'], borderWidth: 1 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
  }

  const ctxMonthly = document.getElementById('monthlySalesChart');
  if (ctxMonthly) {
    if (monthlySalesChartInst) monthlySalesChartInst.destroy();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonthName = monthNames[new Date().getMonth()];
    monthlySalesChartInst = new Chart(ctxMonthly.getContext('2d'), {
      type: 'bar',
      data: {
        labels: [currentMonthName],
        datasets: [{ label: 'Current Month Sales (₹)', data: [monthSales], backgroundColor: '#8b5cf6', borderRadius: 6, barThickness: 50 }]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { callback: function(val) { return '₹' + val; } } } } }
    });
  }
};