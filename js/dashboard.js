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
  // --- ১. লেটেস্ট Doughnut Chart (Today's Sales) ---
  const ctxToday = document.getElementById('todaySalesChart');
  if (ctxToday) {
    if (window.todaySalesChartInst) window.todaySalesChartInst.destroy();
    window.todaySalesChartInst = new Chart(ctxToday.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['Scooty', 'Bike', 'Cycle'],
        datasets: [{ 
          data: [scooty, bike, cycle], 
          backgroundColor: ['#eab308', '#10b981', '#ef4444'],
          hoverBackgroundColor: ['#facc15', '#34d399', '#f87171'], // হোভার কালার
          borderWidth: 3,
          borderColor: '#ffffff',
          hoverOffset: 12 // হোভার করলে স্লাইসটা বেরিয়ে আসবে
        }]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false, 
        cutout: '72%', // রিং-টা মডার্ন স্লিম করা হলো
        plugins: { 
          legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } },
          tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', padding: 12, cornerRadius: 8 }
        } 
      }
    });
  }

  // --- ২. লেটেস্ট Bar Chart (Monthly Sales) ---
  const ctxMonthly = document.getElementById('monthlySalesChart');
  if (ctxMonthly) {
    if (window.monthlySalesChartInst) window.monthlySalesChartInst.destroy();
    
    // মডার্ন গ্রেডিয়েন্ট কালার (বেগুনি থেকে নীল)
    const context2D = ctxMonthly.getContext('2d');
    const gradientBar = context2D.createLinearGradient(0, 0, 0, 400);
    gradientBar.addColorStop(0, '#8b5cf6'); 
    gradientBar.addColorStop(1, '#3b82f6'); 

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonthName = monthNames[new Date().getMonth()];
    
    window.monthlySalesChartInst = new Chart(context2D, {
      type: 'bar',
      data: {
        labels: [currentMonthName],
        datasets: [{ 
          label: 'Current Month Sales (₹)', 
          data: [monthSales], 
          backgroundColor: gradientBar, 
          borderRadius: 8, // মাথা গোল করা হলো
          maxBarThickness: 55 // বারের সাইজ পারফেক্ট করা হলো
        }]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', padding: 12, cornerRadius: 8 }
        },
        scales: { 
          x: { grid: { display: false, drawBorder: false } },
          y: { 
            beginAtZero: true, 
            grid: { color: '#e2e8f0', borderDash: [5, 5], drawBorder: false }, // ব্যাকগ্রাউন্ড ড্যাশ দাগ
            ticks: { callback: function(val) { return '₹' + val; } } 
          } 
        } 
      }
    });
  }
};