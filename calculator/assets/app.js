(function() {
    'use strict';

    // ==================== State ====================
    let currentInput = '0';
    let previousInput = '';
    let operator = null;
    let shouldResetScreen = false;
    let angleMode = 'DEG'; // DEG or RAD
    let history = [];
    let isLandscape = false;

    // ==================== DOM Elements ====================
    const displayMain = document.getElementById('displayMain');
    const displayHistory = document.getElementById('displayHistory');
    const angleIndicator = document.getElementById('angleIndicator');
    const buttonPanel = document.getElementById('buttonPanel');
    const calculatorMode = document.getElementById('calculatorMode');
    const equationMode = document.getElementById('equationMode');
    const historyPanel = document.getElementById('historyPanel');
    const historyList = document.getElementById('historyList');
    const overlay = document.getElementById('overlay');
    const eqResult = document.getElementById('eqResult');
    const eqSteps = document.getElementById('eqSteps');
    const eqAnswer = document.getElementById('eqAnswer');
    const eqInput = document.getElementById('eqInput');

    // ==================== Button Definitions ====================
    const portraitButtons = [
        { label: 'C', class: 'btn-special', action: 'clear' },
        { label: 'DEL', class: 'btn-special', action: 'delete' },
        { label: '%', class: 'btn-function', action: 'percent' },
        { label: '÷', class: 'btn-operator', action: 'operator', value: '/' },
        { label: '7', class: 'btn-number', action: 'number', value: '7' },
        { label: '8', class: 'btn-number', action: 'number', value: '8' },
        { label: '9', class: 'btn-number', action: 'number', value: '9' },
        { label: '×', class: 'btn-operator', action: 'operator', value: '*' },
        { label: '4', class: 'btn-number', action: 'number', value: '4' },
        { label: '5', class: 'btn-number', action: 'number', value: '5' },
        { label: '6', class: 'btn-number', action: 'number', value: '6' },
        { label: '-', class: 'btn-operator', action: 'operator', value: '-' },
        { label: '1', class: 'btn-number', action: 'number', value: '1' },
        { label: '2', class: 'btn-number', action: 'number', value: '2' },
        { label: '3', class: 'btn-number', action: 'number', value: '3' },
        { label: '+', class: 'btn-operator', action: 'operator', value: '+' },
        { label: '±', class: 'btn-function', action: 'negate' },
        { label: '0', class: 'btn-number', action: 'number', value: '0' },
        { label: '.', class: 'btn-number', action: 'decimal', value: '.' },
        { label: '=', class: 'btn-equals', action: 'equals' }
    ];

    const landscapeButtons = [
        { label: 'sin', class: 'btn-function', action: 'func', value: 'sin(' },
        { label: 'cos', class: 'btn-function', action: 'func', value: 'cos(' },
        { label: 'tan', class: 'btn-function', action: 'func', value: 'tan(' },
        { label: 'log', class: 'btn-function', action: 'func', value: 'log(' },
        { label: 'ln', class: 'btn-function', action: 'func', value: 'ln(' },
        { label: 'C', class: 'btn-special', action: 'clear' },
        { label: 'asin', class: 'btn-function', action: 'func', value: 'asin(' },
        { label: 'acos', class: 'btn-function', action: 'func', value: 'acos(' },
        { label: 'atan', class: 'btn-function', action: 'func', value: 'atan(' },
        { label: 'log₂', class: 'btn-function', action: 'func', value: 'log2(' },
        { label: '10ˣ', class: 'btn-function', action: 'func', value: '10^(' },
        { label: 'DEL', class: 'btn-special', action: 'delete' },
        { label: 'cot', class: 'btn-function', action: 'func', value: 'cot(' },
        { label: 'sec', class: 'btn-function', action: 'func', value: 'sec(' },
        { label: 'csc', class: 'btn-function', action: 'func', value: 'csc(' },
        { label: 'x²', class: 'btn-function', action: 'func', value: '^2' },
        { label: 'x³', class: 'btn-function', action: 'func', value: '^3' },
        { label: '%', class: 'btn-function', action: 'percent' },
        { label: 'π', class: 'btn-function', action: 'const', value: 'pi' },
        { label: 'e', class: 'btn-function', action: 'const', value: 'e' },
        { label: 'xʸ', class: 'btn-function', action: 'func', value: '^(' },
        { label: 'eˣ', class: 'btn-function', action: 'func', value: 'e^(' },
        { label: '√', class: 'btn-function', action: 'func', value: 'sqrt(' },
        { label: '³√', class: 'btn-function', action: 'func', value: 'cbrt(' },
        { label: '(', class: 'btn-function', action: 'func', value: '(' },
        { label: ')', class: 'btn-function', action: 'func', value: ')' },
        { label: '7', class: 'btn-number', action: 'number', value: '7' },
        { label: '8', class: 'btn-number', action: 'number', value: '8' },
        { label: '9', class: 'btn-number', action: 'number', value: '9' },
        { label: '÷', class: 'btn-operator', action: 'operator', value: '/' },
        { label: '|x|', class: 'btn-function', action: 'func', value: 'abs(' },
        { label: 'n!', class: 'btn-function', action: 'func', value: 'fact(' },
        { label: '4', class: 'btn-number', action: 'number', value: '4' },
        { label: '5', class: 'btn-number', action: 'number', value: '5' },
        { label: '6', class: 'btn-number', action: 'number', value: '6' },
        { label: '×', class: 'btn-operator', action: 'operator', value: '*' },
        { label: '1/x', class: 'btn-function', action: 'func', value: '1/(' },
        { label: 'ʸ√', class: 'btn-function', action: 'func', value: 'root(' },
        { label: '1', class: 'btn-number', action: 'number', value: '1' },
        { label: '2', class: 'btn-number', action: 'number', value: '2' },
        { label: '3', class: 'btn-number', action: 'number', value: '3' },
        { label: '-', class: 'btn-operator', action: 'operator', value: '-' },
        { label: 'floor', class: 'btn-function', action: 'func', value: 'floor(' },
        { label: 'ceil', class: 'btn-function', action: 'func', value: 'ceil(' },
        { label: '±', class: 'btn-function', action: 'negate' },
        { label: '0', class: 'btn-number', action: 'number', value: '0' },
        { label: '.', class: 'btn-number', action: 'decimal', value: '.' },
        { label: '+', class: 'btn-operator', action: 'operator', value: '+' },
        { label: 'round', class: 'btn-function', action: 'func', value: 'round(' },
        { label: 'DEG', class: 'btn-function', action: 'toggleAngle' },
        { label: '=', class: 'btn-equals', action: 'equals' }
    ];

    // ==================== Initialization ====================
    function init() {
        loadHistory();
        checkOrientation();
        renderButtons();
        updateDisplay();
        window.addEventListener('resize', onResize);
        window.addEventListener('orientationchange', onResize);
        document.addEventListener('keydown', handleKeydown);
    }

    function onResize() {
        checkOrientation();
        renderButtons();
    }

    function checkOrientation() {
        isLandscape = window.innerWidth > window.innerHeight && window.innerWidth >= 600;
    }

    function renderButtons() {
        buttonPanel.innerHTML = '';
        buttonPanel.className = 'button-panel ' + (isLandscape ? 'landscape' : 'portrait');
        const buttons = isLandscape ? landscapeButtons : portraitButtons;
        buttons.forEach(function(btn) {
            const el = document.createElement('button');
            el.className = 'btn ' + btn.class;
            el.textContent = btn.label;
            el.onclick = function() { handleButton(btn); };
            buttonPanel.appendChild(el);
        });
    }

    // ==================== Display ====================
    function updateDisplay() {
        let text = currentInput;
        if (text.length > 12) {
            displayMain.className = 'display-main tiny';
        } else if (text.length > 8) {
            displayMain.className = 'display-main small';
        } else {
            displayMain.className = 'display-main';
        }
        displayMain.textContent = text;
        angleIndicator.textContent = angleMode;
    }

    function updateHistoryDisplay() {
        if (previousInput && operator) {
            displayHistory.textContent = previousInput + ' ' + getOperatorSymbol(operator);
        } else {
            displayHistory.textContent = '';
        }
    }

    function getOperatorSymbol(op) {
        const map = { '+': '+', '-': '-', '*': '×', '/': '÷' };
        return map[op] || op;
    }

    // ==================== Button Handlers ====================
    function handleButton(btn) {
        switch (btn.action) {
            case 'number':
                appendNumber(btn.value);
                break;
            case 'decimal':
                appendDecimal();
                break;
            case 'operator':
                setOperator(btn.value);
                break;
            case 'clear':
                clearAll();
                break;
            case 'delete':
                deleteLast();
                break;
            case 'equals':
                calculate();
                break;
            case 'negate':
                negate();
                break;
            case 'percent':
                percentage();
                break;
            case 'func':
                appendFunction(btn.value);
                break;
            case 'const':
                appendConstant(btn.value);
                break;
            case 'toggleAngle':
                toggleAngleMode();
                break;
        }
        updateDisplay();
    }

    function appendNumber(num) {
        if (shouldResetScreen) {
            currentInput = num;
            shouldResetScreen = false;
        } else {
            currentInput = currentInput === '0' ? num : currentInput + num;
        }
    }

    function appendDecimal() {
        if (shouldResetScreen) {
            currentInput = '0.';
            shouldResetScreen = false;
            return;
        }
        const parts = currentInput.split(/[\+\-\*\/\^]/);
        const lastPart = parts[parts.length - 1];
        if (!lastPart.includes('.')) {
            currentInput += '.';
        }
    }

    function setOperator(op) {
        if (operator !== null && !shouldResetScreen) {
            calculate();
        }
        previousInput = currentInput;
        operator = op;
        shouldResetScreen = true;
        updateHistoryDisplay();
    }

    function clearAll() {
        currentInput = '0';
        previousInput = '';
        operator = null;
        shouldResetScreen = false;
        updateHistoryDisplay();
    }

    function deleteLast() {
        if (currentInput.length > 1) {
            currentInput = currentInput.slice(0, -1);
        } else {
            currentInput = '0';
        }
    }

    function negate() {
        if (currentInput === '0') return;
        if (currentInput.startsWith('-')) {
            currentInput = currentInput.slice(1);
        } else {
            currentInput = '-' + currentInput;
        }
    }

    function percentage() {
        const val = parseFloat(currentInput);
        if (!isNaN(val)) {
            currentInput = String(val / 100);
        }
    }

    function appendFunction(func) {
        if (shouldResetScreen || currentInput === '0') {
            currentInput = func;
            shouldResetScreen = false;
        } else {
            currentInput += func;
        }
    }

    function appendConstant(name) {
        const val = name === 'pi' ? Math.PI : Math.E;
        if (shouldResetScreen || currentInput === '0') {
            currentInput = String(val);
            shouldResetScreen = false;
        } else {
            currentInput += String(val);
        }
    }

    function toggleAngleMode() {
        angleMode = angleMode === 'DEG' ? 'RAD' : 'DEG';
        updateDisplay();
    }

    // ==================== Calculation Engine ====================
    function calculate() {
        let expr = currentInput;
        if (operator && previousInput && !shouldResetScreen) {
            expr = previousInput + operator + currentInput;
            displayHistory.textContent = expr + ' =';
        }

        try {
            const result = evaluateExpression(expr);
            const resultStr = formatResult(result);
            addToHistory(expr, resultStr);
            currentInput = resultStr;
            previousInput = '';
            operator = null;
            shouldResetScreen = true;
            updateHistoryDisplay();
        } catch (e) {
            currentInput = 'Error';
            shouldResetScreen = true;
        }
    }

    function evaluateExpression(expr) {
        // Replace symbols
        expr = expr.replace(/×/g, '*').replace(/÷/g, '/');
        expr = expr.replace(/\^/g, '**');
        expr = expr.replace(/π/g, '(' + Math.PI + ')');
        // Replace standalone e (not part of a number like 1.5e3 or 2e-5)
        expr = expr.replace(/(^|[^\d.])e([^\d]|$)/g, function(m, before, after) {
            return before + '(' + Math.E + ')' + after;
        });

        // Custom functions
        const funcs = {
            sin: function(x) { return trigFunc(Math.sin, x); },
            cos: function(x) { return trigFunc(Math.cos, x); },
            tan: function(x) { return trigFunc(Math.tan, x); },
            cot: function(x) { return 1 / trigFunc(Math.tan, x); },
            sec: function(x) { return 1 / trigFunc(Math.cos, x); },
            csc: function(x) { return 1 / trigFunc(Math.sin, x); },
            asin: function(x) { return invTrigFunc(Math.asin, x); },
            acos: function(x) { return invTrigFunc(Math.acos, x); },
            atan: function(x) { return invTrigFunc(Math.atan, x); },
            log: function(x) { return Math.log10(x); },
            ln: function(x) { return Math.log(x); },
            log2: function(x) { return Math.log2(x); },
            sqrt: function(x) { return Math.sqrt(x); },
            cbrt: function(x) { return Math.cbrt(x); },
            root: function(x, y) { return Math.pow(x, 1 / y); },
            abs: function(x) { return Math.abs(x); },
            floor: function(x) { return Math.floor(x); },
            ceil: function(x) { return Math.ceil(x); },
            round: function(x) { return Math.round(x); },
            fact: function(x) {
                if (x < 0) return NaN;
                if (x === 0 || x === 1) return 1;
                let r = 1;
                for (let i = 2; i <= x; i++) r *= i;
                return r;
            }
        };

        // Build function wrapper string
        const funcKeys = Object.keys(funcs);
        const funcDefs = funcKeys.map(function(k) {
            return 'var ' + k + ' = funcs["' + k + '"];';
        }).join('\n');

        // Safe eval with custom functions
        const code = funcDefs + '\nreturn (' + expr + ');';
        const fn = new Function('funcs', code);
        return fn(funcs);
    }

    function trigFunc(mathFn, x) {
        if (angleMode === 'DEG') {
            x = x * Math.PI / 180;
        }
        return mathFn(x);
    }

    function invTrigFunc(mathFn, x) {
        let r = mathFn(x);
        if (angleMode === 'DEG') {
            r = r * 180 / Math.PI;
        }
        return r;
    }

    function formatResult(val) {
        if (!isFinite(val) || isNaN(val)) return 'Error';
        // Scientific notation for very large/small
        if (Math.abs(val) >= 1e10 || (Math.abs(val) < 1e-10 && val !== 0)) {
            return val.toExponential(6);
        }
        const str = String(val);
        if (str.length > 14) {
            return parseFloat(val.toPrecision(12)).toString();
        }
        return str;
    }

    // ==================== Keyboard Support ====================
    function handleKeydown(e) {
        const key = e.key;
        if (/[0-9]/.test(key)) {
            appendNumber(key);
        } else if (key === '.') {
            appendDecimal();
        } else if (key === '+' || key === '-' || key === '*' || key === '/') {
            setOperator(key);
        } else if (key === 'Enter' || key === '=') {
            e.preventDefault();
            calculate();
        } else if (key === 'Escape' || key === 'c' || key === 'C') {
            clearAll();
        } else if (key === 'Backspace') {
            deleteLast();
        } else if (key === '%') {
            percentage();
        } else if (key === '(' || key === ')') {
            appendFunction(key);
        } else if (key === '^') {
            appendFunction('^(');
        }
        updateDisplay();
    }

    // ==================== History ====================
    function addToHistory(expr, result) {
        history.unshift({ expr: expr, result: result, time: Date.now() });
        if (history.length > 50) history.pop();
        saveHistory();
        renderHistory();
    }

    function saveHistory() {
        try {
            localStorage.setItem('calculator_history', JSON.stringify(history));
        } catch (e) {}
    }

    function loadHistory() {
        try {
            const data = localStorage.getItem('calculator_history');
            if (data) history = JSON.parse(data);
        } catch (e) {}
        renderHistory();
    }

    function renderHistory() {
        if (history.length === 0) {
            historyList.innerHTML = '<div class="history-empty">暂无计算记录</div>';
            return;
        }
        historyList.innerHTML = history.map(function(item, idx) {
            return '<div class="history-item" onclick="loadHistoryItem(' + idx + ')">' +
                '<div class="history-expr">' + escapeHtml(item.expr) + '</div>' +
                '<div class="history-result">= ' + escapeHtml(item.result) + '</div>' +
                '</div>';
        }).join('');
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    window.loadHistoryItem = function(idx) {
        if (history[idx]) {
            currentInput = history[idx].expr;
            shouldResetScreen = true;
            updateDisplay();
            toggleHistory();
        }
    };

    window.clearHistory = function() {
        history = [];
        saveHistory();
        renderHistory();
    };

    window.toggleHistory = function() {
        historyPanel.classList.toggle('open');
        overlay.classList.toggle('active');
    };

    // ==================== Mode Switching ====================
    window.switchMode = function(mode) {
        document.querySelectorAll('.mode-btn').forEach(function(btn) {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        if (mode === 'calculator') {
            calculatorMode.style.display = 'flex';
            equationMode.classList.remove('active');
        } else {
            calculatorMode.style.display = 'none';
            equationMode.classList.add('active');
        }
    };

    window.goBack = function() {
        if (window.history.length > 1) {
            window.location.href = '../../index.html';
        } else {
            window.location.href = '../index.html';
        }
    };

    // ==================== Equation Solver ====================
    window.solveEquation = function() {
        const input = eqInput.value.trim();
        if (!input) {
            alert('请输入方程组');
            return;
        }

        const lines = input.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l; });
        if (lines.length < 2) {
            alert('至少需要两个方程');
            return;
        }

        try {
            const result = solveLinearSystem(lines);
            showEquationResult(result);
        } catch (e) {
            alert('求解错误: ' + e.message);
        }
    };

    window.clearEquation = function() {
        eqInput.value = '';
        eqResult.classList.remove('active');
    };

    function showEquationResult(result) {
        eqSteps.innerHTML = result.steps.map(function(step, i) {
            return '<div class="eq-step">' +
                '<div class="eq-step-num">步骤 ' + (i + 1) + '</div>' +
                '<div class="eq-step-content">' + escapeHtml(step) + '</div>' +
                '</div>';
        }).join('');
        eqAnswer.textContent = result.answer;
        eqResult.classList.add('active');
    }

    function solveLinearSystem(lines) {
        const vars = detectVariables(lines);
        if (vars.length > 3) {
            throw new Error('仅支持最多3元方程组');
        }

        const n = vars.length;
        const matrix = [];
        const rhs = [];

        lines.forEach(function(line) {
            const parsed = parseEquation(line, vars);
            matrix.push(parsed.coeffs);
            rhs.push(parsed.constant);
        });

        if (matrix.length !== n) {
            throw new Error('方程数量与未知数数量不匹配');
        }

        const steps = [];
        steps.push('原始方程组:');
        lines.forEach(function(line) {
            steps.push('  ' + line);
        });

        // Gaussian elimination with steps
        const aug = matrix.map(function(row, i) {
            return row.concat([rhs[i]]);
        });

        steps.push('');
        steps.push('使用高斯消元法求解:');

        for (let col = 0; col < n; col++) {
            // Find pivot
            let pivotRow = col;
            for (let r = col + 1; r < n; r++) {
                if (Math.abs(aug[r][col]) > Math.abs(aug[pivotRow][col])) {
                    pivotRow = r;
                }
            }

            if (Math.abs(aug[pivotRow][col]) < 1e-10) {
                throw new Error('方程组无解或有无穷多解');
            }

            if (pivotRow !== col) {
                const tmp = aug[col];
                aug[col] = aug[pivotRow];
                aug[pivotRow] = tmp;
                steps.push('交换第' + (col + 1) + '行和第' + (pivotRow + 1) + '行');
            }

            const pivot = aug[col][col];
            for (let c = col; c <= n; c++) {
                aug[col][c] /= pivot;
            }
            steps.push('第' + (col + 1) + '行除以 ' + formatNum(pivot));

            for (let r = 0; r < n; r++) {
                if (r !== col && Math.abs(aug[r][col]) > 1e-10) {
                    const factor = aug[r][col];
                    for (let c = col; c <= n; c++) {
                        aug[r][c] -= factor * aug[col][c];
                    }
                    steps.push('第' + (r + 1) + '行减去 ' + formatNum(factor) + ' × 第' + (col + 1) + '行');
                }
            }
        }

        const solution = [];
        for (let i = 0; i < n; i++) {
            solution.push(aug[i][n]);
        }

        steps.push('');
        steps.push('回代得到解:');
        const answerParts = [];
        vars.forEach(function(v, i) {
            answerParts.push(v + ' = ' + formatNum(solution[i]));
            steps.push('  ' + v + ' = ' + formatNum(solution[i]));
        });

        return {
            steps: steps,
            answer: answerParts.join(', '),
            solution: solution,
            vars: vars
        };
    }

    function detectVariables(lines) {
        const vars = new Set();
        lines.forEach(function(line) {
            const matches = line.match(/[a-zA-Z]/g);
            if (matches) {
                matches.forEach(function(v) { vars.add(v); });
            }
        });
        return Array.from(vars).sort();
    }

    function parseEquation(line, vars) {
        // Normalize: remove spaces, handle =
        let expr = line.replace(/\s/g, '');
        const parts = expr.split('=');
        if (parts.length !== 2) {
            throw new Error('方程格式错误: ' + line);
        }

        const left = parts[0];
        const right = parts[1];

        // Parse one side into coefficients and constant
        function parseSide(side) {
            const c = vars.map(function() { return 0; });
            let k = 0;
            // Insert leading + if needed for uniform parsing
            let s = side;
            if (s[0] !== '+' && s[0] !== '-') {
                s = '+' + s;
            }
            const termRegex = /([+\-])(\d*\.?\d*)([a-zA-Z]?)/g;
            let match;
            while ((match = termRegex.exec(s)) !== null) {
                const sign = match[1] === '-' ? -1 : 1;
                const numStr = match[2];
                const varChar = match[3];
                const num = numStr === '' ? 1 : parseFloat(numStr);
                const value = sign * num;
                if (varChar) {
                    const idx = vars.indexOf(varChar);
                    if (idx >= 0) {
                        c[idx] += value;
                    }
                } else {
                    k += value;
                }
            }
            return { c: c, k: k };
        }

        const leftParsed = parseSide(left);
        const rightParsed = parseSide(right);

        const coeffs = vars.map(function(_, i) {
            return leftParsed.c[i] - rightParsed.c[i];
        });
        const constant = rightParsed.k - leftParsed.k;

        return { coeffs: coeffs, constant: constant };
    }

    function formatNum(n) {
        const rounded = Math.round(n * 10000) / 10000;
        return String(rounded);
    }

    // ==================== Start ====================
    init();
})();
