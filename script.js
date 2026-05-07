document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const unifiedDatePicker = document.getElementById('unified-date-picker');
    const rangeDisplay = document.getElementById('range-display');
    const datesListContainer = document.getElementById('dates-list');
    const grandTotalEl = document.getElementById('grand-total');
    
    // Sheet Elements
    const openSettingsBtn = document.getElementById('open-settings-btn');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const sheetOverlay = document.getElementById('sheet-overlay');
    const settingsSheet = document.getElementById('settings-sheet');
    const clearAllBtn = document.getElementById('clear-all-btn');
    const exportBtn = document.getElementById('export-btn');
    const showWeekendToggle = document.getElementById('show-weekend');
    const bulkActionsEl = document.getElementById('bulk-actions');
    const bulkAllDayBtn = document.getElementById('bulk-all-day-btn');
    const bulkResetBtn = document.getElementById('bulk-reset-btn');

    const STORAGE_KEY = 'proxy_teacher_records';
    const SETTINGS_KEY = 'proxy_teacher_settings';

    // Clock for status bar
    setInterval(() => {
        const d = new Date();
        document.getElementById('clock').innerText = `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
    }, 1000);

    // Initialize Flatpickr
    let datePickerInstance = flatpickr(unifiedDatePicker, {
        mode: "range",
        inline: true,
        dateFormat: "Y-m-d",
        locale: "zh_tw",
        disableMobile: "true" // Use flatpickr UI even on mobile
    });

    // Initialize
    let savedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    const todayStr = new Date().toISOString().split('T')[0];
    
    let currentStart, currentEnd;
    
    if (savedSettings.start && savedSettings.end) {
        currentStart = savedSettings.start;
        currentEnd = savedSettings.end;
    } else if (savedSettings.singleDate) {
        // Fallback for old save format
        currentStart = savedSettings.singleDate;
        currentEnd = savedSettings.singleDate;
    } else {
        currentStart = todayStr;
        currentEnd = todayStr;
    }
    
    datePickerInstance.setDate([currentStart, currentEnd]);
    renderList(new Date(currentStart), new Date(currentEnd));

    // Modal logic
    function openSheet() {
        sheetOverlay.classList.add('active');
        settingsSheet.classList.add('active');
    }
    function closeSheet() {
        sheetOverlay.classList.remove('active');
        settingsSheet.classList.remove('active');
    }

    openSettingsBtn.addEventListener('click', openSheet);
    closeSettingsBtn.addEventListener('click', closeSheet);
    sheetOverlay.addEventListener('click', closeSheet);

    saveSettingsBtn.addEventListener('click', () => {
        const selectedDates = datePickerInstance.selectedDates;
        if (selectedDates.length === 0) {
            alert('請選擇有效日期');
            return;
        }
        
        const start = selectedDates[0];
        const end = selectedDates.length === 2 ? selectedDates[1] : selectedDates[0];
        
        const formatLocal = (d) => {
            const tzOffset = d.getTimezoneOffset() * 60000;
            return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
        };
        
        const startStr = formatLocal(start);
        const endStr = formatLocal(end);
        
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ start: startStr, end: endStr }));
        
        renderList(start, end);
        closeSheet();
    });

    // Data Management
    function getSavedRecords() {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    }

    function saveRecord(dateStr, data) {
        const records = getSavedRecords();
        records[dateStr] = data;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    }

    // Render logic
    function renderList(startDate, endDate) {
        const template = document.getElementById('date-card-template');
        rangeDisplay.textContent = `${formatDateStr(startDate)} ~ ${formatDateStr(endDate)}`;

        datesListContainer.innerHTML = '';
        const records = getSavedRecords();
        
        let currentDate = new Date(startDate);
        const days = ['日', '一', '二', '三', '四', '五', '六'];

        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const dayOfWeek = currentDate.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            
            const record = records[dateStr] || { early: false, m1: false, mh: false, lunch: false, m2: false, htime_h: false, htime_m: false, allDay: false, total: 0, confirmed: false };
            
            const clone = template.content.cloneNode(true);
            const card = clone.querySelector('.date-card');
            
            if (isWeekend) {
                card.classList.add('weekend-card');
                if (!showWeekendToggle.checked) {
                    card.style.display = 'none';
                }
            }

            card.dataset.date = dateStr;
            
            const dateTitle = card.querySelector('.date-title');
            dateTitle.textContent = `${currentDate.getMonth() + 1}/${currentDate.getDate()} (${days[dayOfWeek]})`;
            if (isWeekend) dateTitle.style.color = 'var(--ios-red)';

            card.querySelector('.date-total').textContent = `$${record.total || 0}`;

            // Checkboxes setup
            const cbEarly = card.querySelector('[data-type="early"]');
            const cbM1 = card.querySelector('[data-type="m1"]');
            const cbMh = card.querySelector('[data-type="mh"]');
            const cbLunch = card.querySelector('[data-type="lunch"]');
            const cbM2 = card.querySelector('[data-type="m2"]');
            const cbHtimeH = card.querySelector('[data-type="htime_h"]');
            const cbHtimeM = card.querySelector('[data-type="htime_m"]');
            const cbAll = card.querySelector('.all-day-cb');

            cbEarly.checked = record.early;
            cbM1.checked = record.m1;
            cbMh.checked = record.mh;
            cbLunch.checked = record.lunch;
            cbM2.checked = record.m2;
            cbHtimeH.checked = record.htime_h || false;
            cbHtimeM.checked = record.htime_m || false;
            cbAll.checked = record.allDay;

            if (record.allDay) {
                [cbEarly, cbM1, cbMh, cbLunch, cbM2].forEach(c => c.disabled = true);
            }

            // Confirmed state
            const confirmBadge = card.querySelector('.confirmed-badge');
            const confirmBtn = card.querySelector('.confirm-record-btn');
            
            if (record.confirmed) {
                confirmBadge.classList.remove('hidden');
                confirmBtn.classList.add('confirmed');
                confirmBtn.innerHTML = '已儲存';
            } else if (record.total > 0) {
                confirmBtn.classList.add('active');
                confirmBtn.innerHTML = '✅ 儲存';
            }

            datesListContainer.appendChild(card);
            currentDate.setDate(currentDate.getDate() + 1);
        }

        if (startDate.getTime() !== endDate.getTime()) {
            bulkActionsEl.classList.remove('hidden');
        } else {
            bulkActionsEl.classList.add('hidden');
        }

        attachCardEvents();
        updateGrandTotal();
    }

    function attachCardEvents() {
        const cards = document.querySelectorAll('.date-card');
        
        cards.forEach(card => {
            const dateStr = card.dataset.date;
            const indCbs = card.querySelectorAll('.fee-cb');
            const extraCbs = card.querySelectorAll('.extra-cb');
            const allDayCb = card.querySelector('.all-day-cb');
            const cardTotalEl = card.querySelector('.date-total');
            const confirmBadge = card.querySelector('.confirmed-badge');
            const confirmBtn = card.querySelector('.confirm-record-btn');

            let currentConfirmedState = getSavedRecords()[dateStr]?.confirmed || false;

            const saveState = (total) => {
                const data = {
                    early: card.querySelector('[data-type="early"]').checked,
                    m1: card.querySelector('[data-type="m1"]').checked,
                    mh: card.querySelector('[data-type="mh"]').checked,
                    lunch: card.querySelector('[data-type="lunch"]').checked,
                    m2: card.querySelector('[data-type="m2"]').checked,
                    htime_h: card.querySelector('[data-type="htime_h"]').checked,
                    htime_m: card.querySelector('[data-type="htime_m"]').checked,
                    allDay: allDayCb.checked,
                    total: total,
                    confirmed: currentConfirmedState
                };
                
                if (total > 0) {
                    saveRecord(dateStr, data);
                } else {
                    const records = getSavedRecords();
                    delete records[dateStr];
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
                }
            };

            const unconfirmUI = () => {
                currentConfirmedState = false;
                confirmBadge.classList.add('hidden');
                confirmBtn.classList.remove('confirmed');
                
                let sum = 0;
                indCbs.forEach(c => { if(c.checked) sum += parseInt(c.value); });
                if(allDayCb.checked) sum = 550;
                extraCbs.forEach(c => { if(c.checked) sum += parseInt(c.value); });

                if (sum > 0) {
                    confirmBtn.classList.add('active');
                    confirmBtn.innerHTML = '✅ 儲存';
                } else {
                    confirmBtn.classList.remove('active');
                    confirmBtn.innerHTML = '儲存此筆紀錄';
                }
            };

            confirmBtn.addEventListener('click', () => {
                let sum = 0;
                indCbs.forEach(c => { if(c.checked) sum += parseInt(c.value); });
                if(allDayCb.checked) sum = 550;
                extraCbs.forEach(c => { if(c.checked) sum += parseInt(c.value); });
                
                if (sum === 0) {
                    alert('請先勾選代導項目再確認！');
                    return;
                }
                
                currentConfirmedState = true;
                saveState(sum);
                
                confirmBadge.classList.remove('hidden');
                confirmBtn.classList.remove('active');
                confirmBtn.classList.add('confirmed');
                confirmBtn.innerHTML = '已儲存';
            });

            // Individual switches
            indCbs.forEach(cb => {
                cb.addEventListener('change', () => {
                    unconfirmUI();
                    if (allDayCb.checked) return;
                    
                    let sum = 0;
                    let allChecked = true;
                    indCbs.forEach(c => {
                        if (c.checked) sum += parseInt(c.value);
                        else allChecked = false;
                    });
                    
                    extraCbs.forEach(c => { if(c.checked) sum += parseInt(c.value); });

                    if (allChecked) {
                        allDayCb.checked = true;
                        indCbs.forEach(c => { c.checked = true; c.disabled = true; });
                        sum = 550;
                        extraCbs.forEach(c => { if(c.checked) sum += parseInt(c.value); });
                        cardTotalEl.textContent = `$${sum}`;
                        saveState(sum);
                    } else {
                        cardTotalEl.textContent = `$${sum}`;
                        saveState(sum);
                    }
                    updateGrandTotal();
                });
            });

            // Extra switches
            extraCbs.forEach(cb => {
                cb.addEventListener('change', () => {
                    unconfirmUI();
                    let sum = 0;
                    if (allDayCb.checked) {
                        sum = 550;
                    } else {
                        indCbs.forEach(c => { if(c.checked) sum += parseInt(c.value); });
                    }
                    extraCbs.forEach(c => { if(c.checked) sum += parseInt(c.value); });
                    cardTotalEl.textContent = `$${sum}`;
                    saveState(sum);
                    updateGrandTotal();
                });
            });

            // All day switch
            allDayCb.addEventListener('change', (e) => {
                unconfirmUI();
                let sum = 0;
                if (e.target.checked) {
                    indCbs.forEach(c => {
                        c.checked = true;
                        c.disabled = true;
                    });
                    sum = 550;
                } else {
                    indCbs.forEach(c => {
                        c.checked = false;
                        c.disabled = false;
                    });
                    sum = 0;
                }
                extraCbs.forEach(c => { if(c.checked) sum += parseInt(c.value); });
                cardTotalEl.textContent = `$${sum}`;
                saveState(sum);
                updateGrandTotal();
            });
        });
    }

    function updateGrandTotal() {
        let grandTotal = 0;
        document.querySelectorAll('.date-total').forEach(el => {
            grandTotal += parseInt(el.textContent.replace('$', ''));
        });
        
        animateValue(grandTotalEl, parseInt(grandTotalEl.textContent.replace(/[$,]/g, '')) || 0, grandTotal, 300);
    }

    // Toggle weekend visibility
    showWeekendToggle.addEventListener('change', (e) => {
        const weekendCards = document.querySelectorAll('.weekend-card');
        weekendCards.forEach(card => {
            card.style.display = e.target.checked ? 'block' : 'none';
        });
    });

    // Bulk All Day
    bulkAllDayBtn.addEventListener('click', () => {
        if(confirm('確定要將畫面上所有顯示的日子（不含隱藏的假日）設為「全天」並自動儲存嗎？')) {
            const cards = document.querySelectorAll('.date-card');
            cards.forEach(card => {
                if (card.style.display !== 'none') {
                    const allDayCb = card.querySelector('.all-day-cb');
                    if (!allDayCb.checked) {
                        allDayCb.checked = true;
                        allDayCb.dispatchEvent(new Event('change'));
                    }
                    // Trigger confirmation
                    const confirmBtn = card.querySelector('.confirm-record-btn');
                    if (!confirmBtn.classList.contains('confirmed')) {
                        confirmBtn.click();
                    }
                }
            });
        }
    });

    // Bulk Reset
    bulkResetBtn.addEventListener('click', () => {
        if(confirm('確定要將畫面上所有顯示的日子（不含隱藏的假日）清空並重置嗎？')) {
            const cards = document.querySelectorAll('.date-card');
            cards.forEach(card => {
                if (card.style.display !== 'none') {
                    const allDayCb = card.querySelector('.all-day-cb');
                    const indCbs = card.querySelectorAll('.fee-cb');
                    const extraCbs = card.querySelectorAll('.extra-cb');
                    
                    let hasChecked = allDayCb.checked;
                    if (!hasChecked) {
                        indCbs.forEach(c => { if(c.checked) hasChecked = true; });
                        extraCbs.forEach(c => { if(c.checked) hasChecked = true; });
                    }
                    
                    if (hasChecked) {
                        if (allDayCb.checked) {
                            allDayCb.checked = false;
                            allDayCb.dispatchEvent(new Event('change'));
                        } else {
                            indCbs.forEach(c => {
                                if (c.checked) {
                                    c.checked = false;
                                    c.dispatchEvent(new Event('change'));
                                }
                            });
                        }
                        extraCbs.forEach(c => {
                            if (c.checked) {
                                c.checked = false;
                                c.dispatchEvent(new Event('change'));
                            }
                        });
                        
                        const confirmBtn = card.querySelector('.confirm-record-btn');
                        if (confirmBtn.classList.contains('confirmed')) {
                            const dateStr = card.dataset.date;
                            const records = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
                            delete records[dateStr];
                            localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
                            
                            const confirmBadge = card.querySelector('.confirmed-badge');
                            confirmBadge.classList.add('hidden');
                            confirmBtn.classList.remove('confirmed');
                            confirmBtn.classList.remove('active');
                            confirmBtn.innerHTML = '儲存此筆紀錄';
                        }
                    } else if (card.querySelector('.confirm-record-btn').classList.contains('confirmed')) {
                         const confirmBtn = card.querySelector('.confirm-record-btn');
                         confirmBtn.classList.remove('confirmed');
                         confirmBtn.innerHTML = '儲存此筆紀錄';
                         card.querySelector('.confirmed-badge').classList.add('hidden');
                         
                         const dateStr = card.dataset.date;
                         const records = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
                         delete records[dateStr];
                         localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
                    }
                }
            });
            // updateGrandTotal gets called by events, but good to ensure
            let grandTotal = 0;
            document.querySelectorAll('.date-total').forEach(el => {
                grandTotal += parseInt(el.textContent.replace('$', ''));
            });
            const grandTotalEl = document.getElementById('grand-total');
            grandTotalEl.innerHTML = `$${grandTotal.toLocaleString()}`;
        }
    });

    // Clear all
    clearAllBtn.addEventListener('click', () => {
        if(confirm('確定要清除所有裝置上的紀錄嗎？此動作無法復原。')) {
            localStorage.removeItem(STORAGE_KEY);
            
            const selectedDates = datePickerInstance.selectedDates;
            if (selectedDates.length > 0) {
                const start = selectedDates[0];
                const end = selectedDates.length === 2 ? selectedDates[1] : selectedDates[0];
                renderList(start, end);
            }
            
            closeSheet();
            alert('已清除所有紀錄');
        }
    });

    // Export logic using Action Sheet
    const exportActionSheet = document.getElementById('export-action-sheet');
    const shareLineBtn = document.getElementById('share-line-btn');
    const copyTextBtn = document.getElementById('copy-text-btn');
    const nativeShareBtn = document.getElementById('native-share-btn');
    const cancelActionBtn = document.getElementById('cancel-action-btn');

    const exportDatePickerEl = document.getElementById('export-date-picker');
    const exportCalendarContainer = document.getElementById('export-calendar-container');
    const scopeCustom = document.getElementById('scope-custom');
    const scopeAll = document.getElementById('scope-all');
    
    let exportDatePickerInstance = flatpickr(exportDatePickerEl, {
        mode: "range",
        inline: true,
        dateFormat: "Y-m-d",
        locale: "zh_tw",
        disableMobile: "true"
    });

    function updateExportScopeUI() {
        if (scopeCustom.checked) {
            exportCalendarContainer.classList.remove('hidden');
        } else {
            exportCalendarContainer.classList.add('hidden');
        }
    }
    scopeCustom.addEventListener('change', updateExportScopeUI);
    scopeAll.addEventListener('change', updateExportScopeUI);

    function openExportSheet() {
        const selected = datePickerInstance.selectedDates;
        if (selected.length > 0) {
            exportDatePickerInstance.setDate(selected);
        }
        scopeCustom.checked = true;
        updateExportScopeUI();
        
        sheetOverlay.classList.add('active');
        exportActionSheet.classList.add('active');
    }

    function closeExportSheet() {
        sheetOverlay.classList.remove('active');
        exportActionSheet.classList.remove('active');
    }

    exportBtn.addEventListener('click', openExportSheet);
    cancelActionBtn.addEventListener('click', closeExportSheet);
    
    // Make overlay close either sheet
    sheetOverlay.addEventListener('click', () => {
        closeSheet();
        closeExportSheet();
    });

    function getExportText() {
        const scope = document.querySelector('input[name="export-scope"]:checked').value;
        const records = getSavedRecords();
        let total = 0;
        let hasData = false;
        let text = '';
        const days = ['日', '一', '二', '三', '四', '五', '六'];

        if (scope === 'custom') {
            const selectedDates = exportDatePickerInstance.selectedDates;
            if (selectedDates.length === 0) return null;
            
            let exportStart = selectedDates[0];
            let exportEnd = selectedDates.length === 2 ? selectedDates[1] : selectedDates[0];
            
            const formatLocal = (d) => {
                const tzOffset = d.getTimezoneOffset() * 60000;
                return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
            };
            
            const startStr = formatLocal(exportStart);
            const endStr = formatLocal(exportEnd);
            
            text = `代導費用結算\n期間: ${formatDateStr(exportStart)} ~ ${formatDateStr(exportEnd)}\n\n`;
            
            let curr = new Date(startStr);
            let end = new Date(endStr);
            
            const datesToExport = [];
            while (curr <= end) {
                datesToExport.push(curr.toISOString().split('T')[0]);
                curr.setDate(curr.getDate() + 1);
            }
            
            datesToExport.forEach(dateStr => {
                const record = records[dateStr];
                
                if (record && record.total > 0 && record.confirmed) {
                    hasData = true;
                    const d = new Date(dateStr);
                    const dateText = `${d.getMonth() + 1}/${d.getDate()} (${days[d.getDay()]})`;
                    const cardTotal = record.total;
                    
                    let details = [];
                    if (record.allDay) {
                        details.push('全天($550)');
                    } else {
                        if (record.early) details.push('早($200)');
                        if (record.m1) details.push('上大($50)');
                        if (record.mh) details.push('MH($50)');
                        if (record.lunch) details.push('午($200)');
                        if (record.m2) details.push('下大($50)');
                    }
                    if (record.htime_h) details.push('H導($550)');
                    if (record.htime_m) details.push('M導($450)');
                    text += `${dateText} : ${details.join(', ')} -> $${cardTotal}\n`;
                    total += cardTotal;
                }
            });
        } else {
            // scope === 'all'
            text = `代導費用結算\n期間: 所有已儲存紀錄\n\n`;
            const sortedDates = Object.keys(records).sort();
            
            sortedDates.forEach(dateStr => {
                const record = records[dateStr];
                if (record && record.total > 0 && record.confirmed) {
                    hasData = true;
                    
                    // Construct localized date
                    const d = new Date(dateStr);
                    const dateText = `${d.getMonth() + 1}/${d.getDate()} (${days[d.getDay()]})`;
                    
                    const cardTotal = record.total;
                    
                    let details = [];
                    if (record.allDay) {
                        details.push('全天($550)');
                    } else {
                        if (record.early) details.push('早($200)');
                        if (record.m1) details.push('上大($50)');
                        if (record.mh) details.push('MH($50)');
                        if (record.lunch) details.push('午($200)');
                        if (record.m2) details.push('下大($50)');
                    }
                    if (record.htime_h) details.push('H導($550)');
                    if (record.htime_m) details.push('M導($450)');
                    text += `${dateText} : ${details.join(', ')} -> $${cardTotal}\n`;
                    total += cardTotal;
                }
            });
        }
        
        if (!hasData) return null;
        text += `\n總計金額: $${total.toLocaleString()}`;
        return text;
    }

    shareLineBtn.addEventListener('click', () => {
        const text = getExportText();
        if (!text) { alert('目前沒有可匯出的紀錄'); closeExportSheet(); return; }
        
        // LINE URL Scheme for sharing text
        const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
        window.open(lineUrl, '_blank');
        closeExportSheet();
    });

    copyTextBtn.addEventListener('click', () => {
        const text = getExportText();
        if (!text) { alert('目前沒有可匯出的紀錄'); closeExportSheet(); return; }

        navigator.clipboard.writeText(text).then(() => {
            alert('已將明細複製到剪貼簿！');
        }).catch(() => {
            alert('複製失敗，請稍後再試。');
        });
        closeExportSheet();
    });

    nativeShareBtn.addEventListener('click', () => {
        const text = getExportText();
        if (!text) { alert('目前沒有可匯出的紀錄'); closeExportSheet(); return; }

        if (navigator.share) {
            navigator.share({
                title: '代導費用明細',
                text: text
            }).catch(console.error);
        } else {
            alert('您的瀏覽器不支援原生分享功能，請使用複製功能。');
        }
        closeExportSheet();
    });

    function formatDateStr(date) {
        return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
    }

    function animateValue(obj, start, end, duration) {
        if (start === end) {
            obj.innerHTML = `$${end.toLocaleString()}`;
            return;
        }
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = `$${Math.floor(progress * (end - start) + start).toLocaleString()}`;
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }
});
