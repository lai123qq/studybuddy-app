/**
 * 数学计算题练习工具 - 核心逻辑
 * Math Practice Tool - Core Logic
 *
 * 功能：
 * 1. 按年级和题型生成数学题目
 * 2. 练习模式与错题本
 * 3. 统计功能（正确率、用时、连对等）
 * 4. localStorage 持久化
 *
 * 兼容：ES5（不使用箭头函数/let/const）
 * 编码：UTF-8
 */

(function(global) {
    'use strict';

    // =====================
    // 工具函数
    // =====================

    /**
     * 生成指定范围内的随机整数
     */
    function randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * 生成指定范围内的随机小数（保留指定位数）
     */
    function randomDecimal(min, max, places) {
        var num = Math.random() * (max - min) + min;
        var factor = Math.pow(10, places);
        return Math.round(num * factor) / factor;
    }

    /**
     * 计算最大公约数
     */
    function gcd(a, b) {
        a = Math.abs(a);
        b = Math.abs(b);
        while (b !== 0) {
            var temp = b;
            b = a % b;
            a = temp;
        }
        return a;
    }

    /**
     * 计算最小公倍数
     */
    function lcm(a, b) {
        return Math.abs(a * b) / gcd(a, b);
    }

    /**
     * 化简分数，返回 {num: 分子, d: 分母}
     */
    function simplifyFraction(num, d) {
        if (d === 0) return { num: 0, d: 1 };
        var g = gcd(num, d);
        return { num: num / g, d: d / g };
    }

    /**
     * 格式化分数为字符串
     */
    function formatFraction(num, d) {
        if (d === 1) return String(num);
        if (num === 0) return '0';
        var sign = (num < 0 || d < 0) ? '-' : '';
        var absNum = Math.abs(num);
        var absDen = Math.abs(d);
        if (absNum > absDen) {
            var whole = Math.floor(absNum / absDen);
            var remainder = absNum % absDen;
            if (remainder === 0) return sign + whole;
            return sign + whole + ' ' + remainder + '/' + absDen;
        }
        return sign + absNum + '/' + absDen;
    }

    /**
     * 格式化小数（去除末尾多余的0）
     */
    function formatDecimal(num) {
        var str = String(num);
        if (str.indexOf('.') === -1) return str;
        while (str.charAt(str.length - 1) === '0') {
            str = str.slice(0, -1);
        }
        if (str.charAt(str.length - 1) === '.') {
            str = str.slice(0, -1);
        }
        return str;
    }

    /**
     * 深拷贝对象（简单版本）
     */
    function deepCopy(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    // =====================
    // 年级和题型结构定义
    // =====================

    var GRADE_STRUCTURE = {
        '小学': {
            '1年级': ['10以内加减法', '20以内加减法'],
            '2年级': ['100以内加减法', '表内乘法'],
            '3年级': ['万以内加减法', '两位数乘一位数', '除法入门'],
            '4年级': ['大数加减法', '两位数乘两位数', '三位数除以两位数'],
            '5年级': ['小数加减法', '小数乘除法', '分数加减法（同分母）'],
            '6年级': ['分数四则运算', '百分数计算', '比和比例']
        },
        '初中': {
            '7年级': ['有理数运算', '整式加减', '一元一次方程'],
            '8年级': ['整式乘除', '因式分解', '分式运算', '一元二次方程'],
            '9年级': ['二次根式', '一元二次方程（综合）', '函数基础']
        },
        '高中': {
            '10年级': ['集合运算', '函数（定义域/值域）', '指数对数运算'],
            '11年级': ['三角函数', '数列', '立体几何计算'],
            '12年级': ['导数运算', '定积分', '概率统计']
        }
    };

    // =====================
    // 题目生成器
    // =====================

    var QuestionGenerator = {
        /**
         * 根据年级和类型生成随机题目
         * 返回 {question: '算式字符串', answer: '正确答案', type: '题型名'}
         */
        generate: function(grade, type) {
            var generator = this.generators[type];
            if (!generator) {
                return { question: '题目类型暂不支持', answer: '', type: type };
            }
            return generator();
        },

        generators: {}
    };

    // ---------- 小学题目生成器 ----------

    // 1年级 - 10以内加减法
    QuestionGenerator.generators['10以内加减法'] = (function() {
    return function() {

        var ops = ['+', '-'];
        var op = ops[randomInt(0, 1)];
        var a, b, ans;
        if (op === '+') {
            a = randomInt(1, 9);
            b = randomInt(1, 10 - a);
            ans = a + b;
        } else {
            a = randomInt(2, 10);
            b = randomInt(1, a - 1);
            ans = a - b;
        }
        return {
            question: a + ' ' + op + ' ' + b + ' = ?',
            answer: String(ans),
            type: '10以内加减法'
        };
        };
})();;

    // 1年级 - 20以内加减法
    QuestionGenerator.generators['20以内加减法'] = (function() {
    return function() {

        var ops = ['+', '-'];
        var op = ops[randomInt(0, 1)];
        var a, b, ans;
        if (op === '+') {
            a = randomInt(1, 19);
            b = randomInt(1, 20 - a);
            ans = a + b;
        } else {
            a = randomInt(2, 20);
            b = randomInt(1, a - 1);
            ans = a - b;
        }
        return {
            question: a + ' ' + op + ' ' + b + ' = ?',
            answer: String(ans),
            type: '20以内加减法'
        };
        };
})();;

    // 2年级 - 100以内加减法
    QuestionGenerator.generators['100以内加减法'] = (function() {
    return function() {

        var ops = ['+', '-'];
        var op = ops[randomInt(0, 1)];
        var a, b, ans;
        if (op === '+') {
            a = randomInt(10, 90);
            b = randomInt(10, 100 - a);
            ans = a + b;
        } else {
            a = randomInt(20, 100);
            b = randomInt(10, a - 1);
            ans = a - b;
        }
        return {
            question: a + ' ' + op + ' ' + b + ' = ?',
            answer: String(ans),
            type: '100以内加减法'
        };
        };
})();;

    // 2年级 - 表内乘法
    QuestionGenerator.generators['表内乘法'] = (function() {
    return function() {

        var a = randomInt(2, 9);
        var b = randomInt(2, 9);
        return {
            question: a + ' x ' + b + ' = ?',
            answer: String(a * b),
            type: '表内乘法'
        };
        };
})();;

    // 3年级 - 万以内加减法
    QuestionGenerator.generators['万以内加减法'] = (function() {
    return function() {

        var ops = ['+', '-'];
        var op = ops[randomInt(0, 1)];
        var a, b, ans;
        if (op === '+') {
            a = randomInt(100, 9000);
            b = randomInt(100, 10000 - a);
            ans = a + b;
        } else {
            a = randomInt(200, 10000);
            b = randomInt(100, a - 1);
            ans = a - b;
        }
        return {
            question: a + ' ' + op + ' ' + b + ' = ?',
            answer: String(ans),
            type: '万以内加减法'
        };
        };
})();;

    // 3年级 - 两位数乘一位数
    QuestionGenerator.generators['两位数乘一位数'] = (function() {
    return function() {

        var a = randomInt(10, 99);
        var b = randomInt(2, 9);
        return {
            question: a + ' x ' + b + ' = ?',
            answer: String(a * b),
            type: '两位数乘一位数'
        };
        };
})();;

    // 3年级 - 除法入门
    QuestionGenerator.generators['除法入门'] = (function() {
    return function() {

        var b = randomInt(2, 9);
        var ans = randomInt(2, 9);
        var a = b * ans;
        return {
            question: a + ' ÷ ' + b + ' = ?',
            answer: String(ans),
            type: '除法入门'
        };
        };
})();;

    // 4年级 - 大数加减法
    QuestionGenerator.generators['大数加减法'] = (function() {
    return function() {

        var ops = ['+', '-'];
        var op = ops[randomInt(0, 1)];
        var a, b, ans;
        if (op === '+') {
            a = randomInt(1000, 90000);
            b = randomInt(1000, 100000 - a);
            ans = a + b;
        } else {
            a = randomInt(2000, 100000);
            b = randomInt(1000, a - 1);
            ans = a - b;
        }
        return {
            question: a + ' ' + op + ' ' + b + ' = ?',
            answer: String(ans),
            type: '大数加减法'
        };
        };
})();;

    // 4年级 - 两位数乘两位数
    QuestionGenerator.generators['两位数乘两位数'] = (function() {
    return function() {

        var a = randomInt(10, 99);
        var b = randomInt(10, 99);
        return {
            question: a + ' x ' + b + ' = ?',
            answer: String(a * b),
            type: '两位数乘两位数'
        };
        };
})();;

    // 4年级 - 三位数除以两位数
    QuestionGenerator.generators['三位数除以两位数'] = (function() {
    return function() {

        var b = randomInt(10, 99);
        var ans = randomInt(2, 20);
        var a = b * ans;
        // 确保a是三位数
        if (a < 100) {
            a = a + b * randomInt(1, 5);
            ans = Math.floor(a / b);
            a = b * ans;
        }
        return {
            question: a + ' ÷ ' + b + ' = ?',
            answer: String(ans),
            type: '三位数除以两位数'
        };
        };
})();;

    // 5年级 - 小数加减法
    QuestionGenerator.generators['小数加减法'] = (function() {
    return function() {

        var ops = ['+', '-'];
        var op = ops[randomInt(0, 1)];
        var a = randomDecimal(0.1, 99.9, 1);
        var b = randomDecimal(0.1, 99.9, 1);
        var ans;
        if (op === '+') {
            ans = a + b;
            if (ans > 100) {
                a = randomDecimal(0.1, 49.9, 1);
                b = randomDecimal(0.1, 49.9, 1);
                ans = a + b;
            }
        } else {
            if (a < b) {
                var temp = a;
                a = b;
                b = temp;
            }
            ans = a - b;
        }
        return {
            question: formatDecimal(a) + ' ' + op + ' ' + formatDecimal(b) + ' = ?',
            answer: formatDecimal(ans),
            type: '小数加减法'
        };
        };
})();;

    // 5年级 - 小数乘除法
    QuestionGenerator.generators['小数乘除法'] = (function() {
    return function() {

        var ops = ['x', '÷'];
        var op = ops[randomInt(0, 1)];
        var a, b, ans;
        if (op === 'x') {
            a = randomDecimal(0.1, 9.9, 1);
            b = randomInt(2, 9);
            ans = a * b;
            return {
                question: formatDecimal(a) + ' x ' + b + ' = ?',
                answer: formatDecimal(ans),
                type: '小数乘除法'
            };
        } else {
            b = randomInt(2, 9);
            ans = randomDecimal(0.1, 9.9, 1);
            a = ans * b;
            return {
                question: formatDecimal(a) + ' ÷ ' + b + ' = ?',
                answer: formatDecimal(ans),
                type: '小数乘除法'
            };
        }
        };
})();;

    // 5年级 - 分数加减法（同分母）
    QuestionGenerator.generators['分数加减法（同分母）'] = (function() {
    return function() {

        var ops = ['+', '-'];
        var op = ops[randomInt(0, 1)];
        var denominator = randomInt(2, 12);
        var aNum, bNum, ansNum, ansDen;
        if (op === '+') {
            aNum = randomInt(1, denominator - 1);
            bNum = randomInt(1, denominator - aNum);
            ansNum = aNum + bNum;
            ansDen = denominator;
        } else {
            aNum = randomInt(2, denominator - 1);
            bNum = randomInt(1, aNum - 1);
            ansNum = aNum - bNum;
            ansDen = denominator;
        }
        var simplified = simplifyFraction(ansNum, ansDen);
        return {
            question: aNum + '/' + denominator + ' ' + op + ' ' + bNum + '/' + denominator + ' = ?',
            answer: formatFraction(simplified.num, simplified.d),
            type: '分数加减法（同分母）'
        };
        };
})();;

    // 6年级 - 分数四则运算
    QuestionGenerator.generators['分数四则运算'] = (function() {
    return function() {

        var ops = ['+', '-', 'x', '÷'];
        var op = ops[randomInt(0, 3)];
        var aNum, aDen, bNum, bDen, ansNum, ansDen;
        var simplified;

        aDen = randomInt(2, 12);
        aNum = randomInt(1, aDen - 1);
        bDen = randomInt(2, 12);
        bNum = randomInt(1, bDen - 1);

        if (op === '+') {
            ansDen = lcm(aDen, bDen);
            ansNum = aNum * (ansDen / aDen) + bNum * (ansDen / bDen);
        } else if (op === '-') {
            ansDen = lcm(aDen, bDen);
            ansNum = aNum * (ansDen / aDen) - bNum * (ansDen / bDen);
            if (ansNum < 0) {
                var temp = aNum; aNum = bNum; bNum = temp;
                temp = aDen; aDen = bDen; bDen = temp;
                ansNum = aNum * (ansDen / aDen) - bNum * (ansDen / bDen);
            }
        } else if (op === 'x') {
            ansNum = aNum * bNum;
            ansDen = aDen * bDen;
        } else {
            // 除法：a/b ÷ c/d = a/b * d/c
            ansNum = aNum * bDen;
            ansDen = aDen * bNum;
        }

        simplified = simplifyFraction(ansNum, ansDen);
        return {
            question: aNum + '/' + aDen + ' ' + op + ' ' + bNum + '/' + bDen + ' = ?',
            answer: formatFraction(simplified.num, simplified.d),
            type: '分数四则运算'
        };
        };
})();;

    // 6年级 - 百分数计算
    QuestionGenerator.generators['百分数计算'] = (function() {
    return function() {

        var types = ['percent_of', 'find_percent'];
        var t = types[randomInt(0, 1)];
        var base, percent, ans;
        if (t === 'percent_of') {
            base = randomInt(10, 200);
            percent = randomInt(10, 90);
            // 确保结果是整数
            while ((base * percent) % 100 !== 0) {
                base = randomInt(10, 200);
                percent = randomInt(10, 90);
            }
            ans = (base * percent) / 100;
            return {
                question: base + ' 的 ' + percent + '% 是多少？',
                answer: String(ans),
                type: '百分数计算'
            };
        } else {
            base = randomInt(10, 200);
            percent = randomInt(10, 90);
            while ((base * percent) % 100 !== 0) {
                base = randomInt(10, 200);
                percent = randomInt(10, 90);
            }
            ans = (base * percent) / 100;
            return {
                question: ans + ' 是 ' + base + ' 的百分之几？',
                answer: String(percent) + '%',
                type: '百分数计算'
            };
        }
        };
})();;

    // 6年级 - 比和比例
    QuestionGenerator.generators['比和比例'] = (function() {
    return function() {

        var a = randomInt(2, 20);
        var b = randomInt(2, 20);
        var c = randomInt(2, 20);
        var ans = (b * c) / a;
        // 确保结果是整数
        while ((b * c) % a !== 0) {
            a = randomInt(2, 20);
            b = randomInt(2, 20);
            c = randomInt(2, 20);
            ans = (b * c) / a;
        }
        return {
            question: a + ' : ' + b + ' = ' + c + ' : ?',
            answer: String(ans),
            type: '比和比例'
        };
        };
})();;

    // ---------- 初中题目生成器 ----------

    // 7年级 - 有理数运算
    QuestionGenerator.generators['有理数运算'] = (function() {
    return function() {

        var ops = ['+', '-', 'x', '÷'];
        var op = ops[randomInt(0, 3)];
        var a = randomInt(-20, 20);
        var b = randomInt(-20, 20);
        var ans;

        while (a === 0) a = randomInt(-20, 20);
        while (b === 0) b = randomInt(-20, 20);

        if (op === '+') {
            ans = a + b;
        } else if (op === '-') {
            ans = a - b;
        } else if (op === 'x') {
            ans = a * b;
        } else {
            // 确保能整除
            while (a % b !== 0) {
                a = randomInt(-50, 50);
                b = randomInt(-10, 10);
                while (b === 0) b = randomInt(-10, 10);
            }
            ans = a / b;
        }

        var aStr = a < 0 ? '(' + a + ')' : a;
        var bStr = b < 0 ? '(' + b + ')' : b;
        return {
            question: aStr + ' ' + op + ' ' + bStr + ' = ?',
            answer: String(ans),
            type: '有理数运算'
        };
        };
})();;

    // 7年级 - 整式加减
    QuestionGenerator.generators['整式加减'] = (function() {
    return function() {

        var a = randomInt(2, 10);
        var b = randomInt(1, 10);
        var c = randomInt(1, 10);
        var d = randomInt(1, 10);
        var op = randomInt(0, 1) === 0 ? '+' : '-';

        var term1 = (a === 1 ? '' : a) + 'x' + (b === 1 ? '' : ' + ' + b);
        var term2 = (c === 1 ? '' : c) + 'x' + (d === 1 ? '' : ' + ' + d);

        var coefX, constTerm;
        if (op === '+') {
            coefX = a + c;
            constTerm = b + d;
        } else {
            coefX = a - c;
            constTerm = b - d;
        }

        var ans = '';
        if (coefX !== 0) {
            ans = (coefX === 1 ? '' : coefX) + 'x';
        }
        if (constTerm !== 0) {
            if (ans !== '' && constTerm > 0) {
                ans = ans + ' + ' + constTerm;
            } else if (ans !== '' && constTerm < 0) {
                ans = ans + ' - ' + Math.abs(constTerm);
            } else {
                ans = String(constTerm);
            }
        }
        if (ans === '') ans = '0';

        return {
            question: '(' + term1 + ') ' + op + ' (' + term2 + ') = ?',
            answer: ans,
            type: '整式加减'
        };
        };
})();;

    // 7年级 - 一元一次方程
    QuestionGenerator.generators['一元一次方程'] = (function() {
    return function() {

        var a = randomInt(2, 9);
        var x = randomInt(1, 20);
        var b = randomInt(1, 50);
        var c = a * x + b;

        return {
            question: a + 'x + ' + b + ' = ' + c + '，求 x = ?',
            answer: String(x),
            type: '一元一次方程'
        };
        };
})();;

    // 8年级 - 整式乘除
    QuestionGenerator.generators['整式乘除'] = (function() {
    return function() {

        var a = randomInt(2, 5);
        var b = randomInt(1, 5);
        var c = randomInt(2, 5);
        var d = randomInt(1, 5);

        // (ax + b)(cx + d)
        var coefX2 = a * c;
        var coefX = a * d + b * c;
        var constTerm = b * d;

        var ans = '';
        if (coefX2 !== 0) {
            ans = (coefX2 === 1 ? '' : coefX2) + 'x²';
        }
        if (coefX !== 0) {
            if (ans !== '' && coefX > 0) {
                ans = ans + ' + ' + (coefX === 1 ? '' : coefX) + 'x';
            } else if (ans !== '' && coefX < 0) {
                ans = ans + ' - ' + (Math.abs(coefX) === 1 ? '' : Math.abs(coefX)) + 'x';
            } else {
                ans = (coefX === 1 ? '' : coefX) + 'x';
            }
        }
        if (constTerm !== 0) {
            if (ans !== '' && constTerm > 0) {
                ans = ans + ' + ' + constTerm;
            } else if (ans !== '' && constTerm < 0) {
                ans = ans + ' - ' + Math.abs(constTerm);
            } else {
                ans = String(constTerm);
            }
        }

        return {
            question: '(' + a + 'x + ' + b + ')(' + c + 'x + ' + d + ') = ?',
            answer: ans,
            type: '整式乘除'
        };
        };
})();;

    // 8年级 - 因式分解
    QuestionGenerator.generators['因式分解'] = (function() {
    return function() {

        var a = randomInt(1, 5);
        var b = randomInt(1, 5);
        var c = randomInt(1, 5);
        var d = randomInt(1, 5);

        // (ax + b)(cx + d)
        var coefX2 = a * c;
        var coefX = a * d + b * c;
        var constTerm = b * d;

        var question = '';
        if (coefX2 !== 0) {
            question = (coefX2 === 1 ? '' : coefX2) + 'x²';
        }
        if (coefX !== 0) {
            if (question !== '' && coefX > 0) {
                question = question + ' + ' + (coefX === 1 ? '' : coefX) + 'x';
            } else if (question !== '' && coefX < 0) {
                question = question + ' - ' + (Math.abs(coefX) === 1 ? '' : Math.abs(coefX)) + 'x';
            } else {
                question = (coefX === 1 ? '' : coefX) + 'x';
            }
        }
        if (constTerm !== 0) {
            if (question !== '' && constTerm > 0) {
                question = question + ' + ' + constTerm;
            } else if (question !== '' && constTerm < 0) {
                question = question + ' - ' + Math.abs(constTerm);
            } else {
                question = String(constTerm);
            }
        }

        return {
            question: '因式分解：' + question,
            answer: '(' + a + 'x + ' + b + ')(' + c + 'x + ' + d + ')',
            type: '因式分解'
        };
        };
})();;

    // 8年级 - 分式运算
    QuestionGenerator.generators['分式运算'] = (function() {
    return function() {

        var a = randomInt(1, 5);
        var b = randomInt(1, 5);
        var c = randomInt(1, 5);
        var d = randomInt(1, 5);
        var e = randomInt(1, 5);
        var f = randomInt(1, 5);

        // a/b + c/d = (ad + bc) / bd
        var num = a * d + c * b;
        var den2 = b * d;
        var simplified = simplifyFraction(num, den2);

        return {
            question: a + '/' + b + ' + ' + c + '/' + d + ' = ?',
            answer: formatFraction(simplified.num, simplified.d),
            type: '分式运算'
        };
        };
})();;

    // 8年级 - 一元二次方程
    QuestionGenerator.generators['一元二次方程'] = (function() {
    return function() {

        var x1 = randomInt(-5, 5);
        var x2 = randomInt(-5, 5);
        while (x1 === x2) x2 = randomInt(-5, 5);

        var a = 1;
        var b = -(x1 + x2);
        var c = x1 * x2;

        var question = 'x²';
        if (b !== 0) {
            if (b > 0) {
                question = question + ' + ' + b + 'x';
            } else {
                question = question + ' - ' + Math.abs(b) + 'x';
            }
        }
        if (c !== 0) {
            if (c > 0) {
                question = question + ' + ' + c;
            } else {
                question = question + ' - ' + Math.abs(c);
            }
        }
        question = question + ' = 0，求 x = ?';

        var ans;
        if (x1 === x2) {
            ans = 'x = ' + x1;
        } else {
            ans = 'x = ' + x1 + ' 或 x = ' + x2;
        }

        return {
            question: question,
            answer: ans,
            type: '一元二次方程'
        };
        };
})();;

    // 9年级 - 二次根式
    QuestionGenerator.generators['二次根式'] = (function() {
    return function() {

        var a = randomInt(1, 10);
        var b = randomInt(1, 10);
        var c = a * a * b;

        return {
            question: '化简 √' + c,
            answer: String(a) + '√' + b,
            type: '二次根式'
        };
        };
})();;

    // 9年级 - 一元二次方程（综合）
    QuestionGenerator.generators['一元二次方程（综合）'] = (function() {
    return function() {

        var a = randomInt(1, 3);
        var x1 = randomInt(-5, 5);
        var x2 = randomInt(-5, 5);
        while (x1 === x2) x2 = randomInt(-5, 5);

        var b = -a * (x1 + x2);
        var c = a * x1 * x2;

        var question = (a === 1 ? '' : a) + 'x²';
        if (b !== 0) {
            if (b > 0) {
                question = question + ' + ' + b + 'x';
            } else {
                question = question + ' - ' + Math.abs(b) + 'x';
            }
        }
        if (c !== 0) {
            if (c > 0) {
                question = question + ' + ' + c;
            } else {
                question = question + ' - ' + Math.abs(c);
            }
        }
        question = question + ' = 0，求 x = ?';

        var ans;
        if (x1 === x2) {
            ans = 'x = ' + x1;
        } else {
            ans = 'x = ' + x1 + ' 或 x = ' + x2;
        }

        return {
            question: question,
            answer: ans,
            type: '一元二次方程（综合）'
        };
        };
})();;

    // 9年级 - 函数基础
    QuestionGenerator.generators['函数基础'] = (function() {
    return function() {

        var k = randomInt(1, 5);
        var b = randomInt(1, 10);
        var x = randomInt(1, 10);
        var y = k * x + b;

        return {
            question: '已知函数 y = ' + k + 'x + ' + b + '，当 x = ' + x + ' 时，y = ?',
            answer: String(y),
            type: '函数基础'
        };
        };
})();;

    // ---------- 高中题目生成器 ----------

    // 10年级 - 集合运算
    QuestionGenerator.generators['集合运算'] = (function() {
    return function() {

        var a = randomInt(1, 10);
        var b = randomInt(1, 10);
        var c = randomInt(1, 10);
        var d = randomInt(1, 10);

        var setA = [a, b];
        var setB = [c, d];
        // 确保有交集
        setB[0] = a;

        var intersection = [];
        var union = [];
        var i, j, found;

        for (i = 0; i < setA.length; i++) {
            found = false;
            for (j = 0; j < setB.length; j++) {
                if (setA[i] === setB[j]) {
                    found = true;
                    break;
                }
            }
            if (found) {
                intersection.push(setA[i]);
            }
            union.push(setA[i]);
        }
        for (i = 0; i < setB.length; i++) {
            found = false;
            for (j = 0; j < union.length; j++) {
                if (setB[i] === union[j]) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                union.push(setB[i]);
            }
        }

        var ops = ['交集', '并集'];
        var op = ops[randomInt(0, 1)];
        var ans;
        if (op === '交集') {
            ans = '{' + intersection.join(', ') + '}';
        } else {
            ans = '{' + union.join(', ') + '}';
        }

        return {
            question: 'A = {' + setA.join(', ') + '}，B = {' + setB.join(', ') + '}，求 A ' + op + ' B',
            answer: ans,
            type: '集合运算'
        };
        };
})();;

    // 10年级 - 函数（定义域/值域）
    QuestionGenerator.generators['函数（定义域/值域）'] = (function() {
    return function() {

        var a = randomInt(1, 5);
        var b = randomInt(1, 10);
        var x = randomInt(1, 10);
        var y = a * x + b;

        var types = ['定义域', '值域'];
        var t = types[randomInt(0, 1)];

        if (t === '定义域') {
            return {
                question: '函数 y = ' + a + 'x + ' + b + '，当 y = ' + y + ' 时，x = ?',
                answer: String(x),
                type: '函数（定义域/值域）'
            };
        } else {
            return {
                question: '函数 y = ' + a + 'x + ' + b + '，当 x = ' + x + ' 时，y = ?',
                answer: String(y),
                type: '函数（定义域/值域）'
            };
        }
        };
})();;

    // 10年级 - 指数对数运算
    QuestionGenerator.generators['指数对数运算'] = (function() {
    return function() {

        var types = ['exp', 'log'];
        var t = types[randomInt(0, 1)];

        if (t === 'exp') {
            var a = randomInt(2, 5);
            var b = randomInt(2, 4);
            var ans = Math.pow(a, b);
            return {
                question: a + '^' + b + ' = ?',
                answer: String(ans),
                type: '指数对数运算'
            };
        } else {
            var base = randomInt(2, 5);
            var exp = randomInt(2, 4);
            var num = Math.pow(base, exp);
            return {
                question: 'log_' + base + '(' + num + ') = ?',
                answer: String(exp),
                type: '指数对数运算'
            };
        }
        };
})();;

    // 11年级 - 三角函数
    QuestionGenerator.generators['三角函数'] = (function() {
    return function() {

        var angles = [0, 30, 45, 60, 90];
        var angle = angles[randomInt(0, 4)];
        var funcs = ['sin', 'cos', 'tan'];
        var func = funcs[randomInt(0, 2)];
        var ans;

        if (func === 'sin') {
            if (angle === 0) ans = '0';
            else if (angle === 30) ans = '1/2';
            else if (angle === 45) ans = '√2/2';
            else if (angle === 60) ans = '√3/2';
            else ans = '1';
        } else if (func === 'cos') {
            if (angle === 0) ans = '1';
            else if (angle === 30) ans = '√3/2';
            else if (angle === 45) ans = '√2/2';
            else if (angle === 60) ans = '1/2';
            else ans = '0';
        } else {
            if (angle === 0) ans = '0';
            else if (angle === 30) ans = '√3/3';
            else if (angle === 45) ans = '1';
            else if (angle === 60) ans = '√3';
            else ans = '不存在';
        }

        return {
            question: func + '(' + angle + '°) = ?',
            answer: ans,
            type: '三角函数'
        };
        };
})();;

    // 11年级 - 数列
    QuestionGenerator.generators['数列'] = (function() {
    return function() {

        var types = ['arithmetic', 'geometric'];
        var t = types[randomInt(0, 1)];
        var a1 = randomInt(1, 10);
        var n = randomInt(3, 6);

        if (t === 'arithmetic') {
            var d = randomInt(1, 5);
            var an = a1 + (n - 1) * d;
            return {
                question: '等差数列，首项 a₁ = ' + a1 + '，公差 d = ' + d + '，求第 ' + n + ' 项 a' + n,
                answer: String(an),
                type: '数列'
            };
        } else {
            var r = randomInt(2, 3);
            var an = a1 * Math.pow(r, n - 1);
            return {
                question: '等比数列，首项 a₁ = ' + a1 + '，公比 q = ' + r + '，求第 ' + n + ' 项 a' + n,
                answer: String(an),
                type: '数列'
            };
        }
        };
})();;

    // 11年级 - 立体几何计算
    QuestionGenerator.generators['立体几何计算'] = (function() {
    return function() {

        var shapes = ['cube', 'cuboid', 'cylinder'];
        var shape = shapes[randomInt(0, 2)];

        if (shape === 'cube') {
            var a = randomInt(2, 10);
            var v = a * a * a;
            return {
                question: '正方体棱长为 ' + a + '，求体积',
                answer: String(v),
                type: '立体几何计算'
            };
        } else if (shape === 'cuboid') {
            var l = randomInt(2, 10);
            var w = randomInt(2, 10);
            var h = randomInt(2, 10);
            var v = l * w * h;
            return {
                question: '长方体长 ' + l + '、宽 ' + w + '、高 ' + h + '，求体积',
                answer: String(v),
                type: '立体几何计算'
            };
        } else {
            var r = randomInt(2, 10);
            var h2 = randomInt(2, 10);
            var v = Math.round(Math.PI * r * r * h2);
            return {
                question: '圆柱底面半径 ' + r + '、高 ' + h2 + '，求体积（π取3.14，结果取整数）',
                answer: String(v),
                type: '立体几何计算'
            };
        }
        };
})();;

    // 12年级 - 导数运算
    QuestionGenerator.generators['导数运算'] = (function() {
    return function() {

        var types = ['power', 'poly'];
        var t = types[randomInt(0, 1)];

        if (t === 'power') {
            var n = randomInt(2, 5);
            var a = randomInt(1, 5);
            return {
                question: '求 f(x) = ' + a + 'x^' + n + ' 的导数 f\'(x)',
                answer: String(a * n) + 'x^' + (n - 1),
                type: '导数运算'
            };
        } else {
            var a2 = randomInt(1, 3);
            var b2 = randomInt(1, 5);
            var c2 = randomInt(1, 5);
            return {
                question: '求 f(x) = ' + a2 + 'x² + ' + b2 + 'x + ' + c2 + ' 的导数 f\'(x)',
                answer: String(a2 * 2) + 'x + ' + b2,
                type: '导数运算'
            };
        }
        };
})();;

    // 12年级 - 定积分
    QuestionGenerator.generators['定积分'] = (function() {
    return function() {

        var a = randomInt(1, 3);
        var b = randomInt(1, 3);
        var upper = randomInt(2, 5);
        var lower = 0;

        // ∫(ax + b)dx from 0 to upper
        var ans = (a * upper * upper) / 2 + b * upper;
        // 确保结果是整数
        while (ans !== Math.floor(ans)) {
            a = randomInt(1, 3);
            b = randomInt(1, 3);
            upper = randomInt(2, 5);
            ans = (a * upper * upper) / 2 + b * upper;
        }

        return {
            question: '计算定积分 ∫₀^' + upper + '(' + a + 'x + ' + b + ')dx',
            answer: String(ans),
            type: '定积分'
        };
        };
})();;

    // 12年级 - 概率统计
    QuestionGenerator.generators['概率统计'] = (function() {
    return function() {

        var types = ['mean', 'probability'];
        var t = types[randomInt(0, 1)];

        if (t === 'mean') {
            var nums = [];
            var sum = 0;
            var count = randomInt(3, 5);
            for (var i = 0; i < count; i++) {
                var num = randomInt(1, 20);
                nums.push(num);
                sum += num;
            }
            var ans = sum / count;
            // 确保结果是整数
            while (ans !== Math.floor(ans)) {
                nums = [];
                sum = 0;
                count = randomInt(3, 5);
                for (var j = 0; j < count; j++) {
                    num = randomInt(1, 20);
                    nums.push(num);
                    sum += num;
                }
                ans = sum / count;
            }
            return {
                question: '求 ' + nums.join(', ') + ' 的平均数',
                answer: String(ans),
                type: '概率统计'
            };
        } else {
            var total = randomInt(10, 20);
            var favorable = randomInt(1, total - 1);
            var g = gcd(favorable, total);
            var simplified = simplifyFraction(favorable, total);
            return {
                question: '袋中有 ' + total + ' 个球，其中 ' + favorable + ' 个红球，随机取一个，取到红球的概率是？',
                answer: formatFraction(simplified.num, simplified.d),
                type: '概率统计'
            };
        }
        };
})();;

    // =====================
    // 核心功能模块
    // =====================

    var MathPractice = {
        // 当前状态
        currentGrade: null,
        currentType: null,
        currentQuestion: null,
        isPracticing: false,
        startTime: null,
        currentSession: null,
        questionsPerSession: 10,

        // 统计数据
        stats: {
            totalQuestions: 0,
            correctCount: 0,
            wrongCount: 0,
            streakCount: 0,
            maxStreak: 0,
            sessionStartTime: null,
            history: []
        },

        // 错题本
        wrongQuestions: [],

        // 初始化
        init: function() {
            this.loadState();
            this.renderGradeTabs();
            this.bindEvents();
            this.updateStatsUI();
            // 恢复上次选择
            if (this.lastGrade && this.lastType) {
                this.startPractice(this.lastGrade, this.lastType);
                this.renderQuestion();
                var submitBtn = document.getElementById('submitBtn');
                if (submitBtn) submitBtn.disabled = false;
            }
        },

        // ---------- UI 渲染 ----------

        /**
         * 渲染年级选项卡
         */
        renderGradeTabs: function() {
            var container = document.getElementById('gradeTabs');
            if (!container) return;
            container.innerHTML = '';

            var categories = ['小学', '初中', '高中'];
            for (var i = 0; i < categories.length; i++) {
                var cat = categories[i];
                var btn = document.createElement('button');
                btn.className = 'grade-tab';
                btn.textContent = cat;
                btn.dataset.category = cat;
                if (i === 0) btn.classList.add('active');
                container.appendChild(btn);
            }

            // 默认渲染第一个分类的题型
            this.renderTypeList('小学');
        },

        /**
         * 渲染题型列表
         */
        renderTypeList: function(category) {
            var container = document.getElementById('typeList');
            if (!container) return;
            container.innerHTML = '';

            var grades = GRADE_STRUCTURE[category];
            if (!grades) return;

            for (var grade in grades) {
                if (!grades.hasOwnProperty(grade)) continue;
                var types = grades[grade];
                for (var i = 0; i < types.length; i++) {
                    var btn = document.createElement('button');
                    btn.className = 'type-btn';
                    btn.textContent = types[i];
                    btn.dataset.grade = grade;
                    btn.dataset.type = types[i];
                    btn.dataset.category = category;
                    container.appendChild(btn);
                }
            }
        },

        /**
         * 渲染当前题目
         */
        renderQuestion: function() {
            var area = document.getElementById('questionArea');
            if (!area || !this.currentQuestion) return;

            area.innerHTML = '';

            var qText = document.createElement('div');
            qText.className = 'question-text';
            qText.textContent = this.currentQuestion.question;
            area.appendChild(qText);

            // AI 巩固练习进度
            if (this.isAiPractice) {
                var progress = document.createElement('div');
                progress.style.cssText = 'text-align:center;font-size:12px;color:#5b8ec4;font-weight:600;margin-bottom:10px;';
                progress.textContent = '🤖 巩固 ' + (this.aiPracticeCount || 0) + '/' + this.aiPracticeTarget;
                area.appendChild(progress);
            }

            var input = document.createElement('input');
            input.type = 'text';
            input.className = 'question-input';
            input.id = 'answerInput';
            input.placeholder = '输入答案';
            area.appendChild(input);

            var feedback = document.createElement('div');
            feedback.className = 'feedback';
            feedback.id = 'feedback';
            area.appendChild(feedback);

            // 自动聚焦
            setTimeout(function() { input.focus(); }, 100);
        },

        /**
         * 更新统计UI
         */
        updateStatsUI: function() {
            var elCorrect = document.getElementById('statCorrect');
            var elWrong = document.getElementById('statWrong');
            var elRate = document.getElementById('statRate');

            if (elCorrect) elCorrect.textContent = this.stats.correctCount;
            if (elWrong) elWrong.textContent = this.stats.wrongCount;

            var total = this.stats.correctCount + this.stats.wrongCount;
            var rate = total > 0 ? Math.round(this.stats.correctCount / total * 100) : 0;
            if (elRate) elRate.textContent = rate + '%';
        },

        /**
         * 渲染错题列表
         */
        /**
         * 分析薄弱环节
         */
        analyzeWeakness: function() {
            var counts = {};
            for (var i = 0; i < this.wrongQuestions.length; i++) {
                var w = this.wrongQuestions[i];
                var key = (w.grade || '未知') + ' · ' + (w.type || '未知题型');
                counts[key] = (counts[key] || 0) + 1;
            }
            var maxCount = 0;
            var weakKey = '';
            for (var k in counts) {
                if (counts[k] > maxCount) {
                    maxCount = counts[k];
                    weakKey = k;
                }
            }
            return { key: weakKey, count: maxCount };
        },

        renderWrongList: function() {
            var container = document.getElementById('wrongList');
            if (!container) return;
            container.innerHTML = '';

            // 薄弱点分析
            var weakness = this.analyzeWeakness();
            if (weakness.key) {
                var tip = document.createElement('div');
                tip.style.cssText = 'background:#f0f7ff;border:1px solid #dbeafe;border-radius:10px;padding:10px 12px;margin-bottom:12px;font-size:12px;color:#5b8ec4;font-weight:600;';
                tip.innerHTML = '🎯 薄弱环节：' + weakness.key + '（错 ' + weakness.count + ' 次）';
                container.appendChild(tip);
            }

            if (this.wrongQuestions.length === 0) {
                container.innerHTML = '<p style="color:#94a3b8;text-align:center;">暂无错题</p>';
                return;
            }

            var self = this;
            for (var i = 0; i < this.wrongQuestions.length; i++) {
                var w = this.wrongQuestions[i];
                var item = document.createElement('div');
                item.className = 'wrong-item';
                item.innerHTML = '<span class="q">' + w.question + '</span>' +
                    '<span class="a">' + (w.correctAnswer || w.answer || '') + '</span>' +
                    '<button class="wrong-clear" data-index="' + i + '">✅ 已掌握</button>';
                container.appendChild(item);
            }

            // 绑定清除按钮
            var clearBtns = container.querySelectorAll('.wrong-clear');
            for (var c = 0; c < clearBtns.length; c++) {
                (function(idx) {
                    clearBtns[idx].addEventListener('click', function() {
                        self.wrongQuestions.splice(parseInt(this.dataset.index), 1);
                        self.saveState();
                        self.renderWrongList();
                        self.updateStatsUI();
                    });
                })(c);
            }

            // 错题 >= 3 显示 AI 巩固练习按钮
            var aiBtn = document.getElementById('aiPracticeBtn');
            if (aiBtn) {
                aiBtn.style.display = this.wrongQuestions.length >= 3 ? 'block' : 'none';
            }
        },

        /**
         * 生成 AI 巩固练习（基于错题题型，跳转到做题界面练习10道）
         */
        generateAiPractice: function() {
            // 统计错题题型分布，找错得最多的题型
            var typeCounts = {};
            for (var i = 0; i < this.wrongQuestions.length; i++) {
                var w = this.wrongQuestions[i];
                var t = w.type || this.currentType || '10以内加减法';
                typeCounts[t] = (typeCounts[t] || 0) + 1;
            }
            var maxCount = 0;
            var mainType = '10以内加减法';
            var mainGrade = '1年级';
            for (var t in typeCounts) {
                if (typeCounts[t] > maxCount) {
                    maxCount = typeCounts[t];
                    mainType = t;
                }
            }
            var cats = ['小学', '初中', '高中'];
            for (var c = 0; c < cats.length; c++) {
                var grades = GRADE_STRUCTURE[cats[c]];
                for (var g in grades) {
                    if (!grades.hasOwnProperty(g)) continue;
                    var types = grades[g];
                    for (var ti = 0; ti < types.length; ti++) {
                        if (types[ti] === mainType) {
                            mainGrade = g;
                            break;
                        }
                    }
                }
            }

            // 保存巩固练习上下文
            this.isAiPractice = true;
            this.aiPracticeGrade = mainGrade;
            this.aiPracticeType = mainType;
            this.aiPracticeTarget = 10;
            this.aiPracticeCount = 0;

            // 跳转到做题区域（silent=true 不重置 isAiPractice）
            this.startPractice(mainGrade, mainType, true);
            this.renderQuestion();

            var submitBtn = document.getElementById('submitBtn');
            if (submitBtn) submitBtn.disabled = false;

            // 关闭错题面板
            var wrongPanel = document.getElementById('wrongPanel');
            if (wrongPanel) wrongPanel.classList.remove('show');

            // 显示巩固练习提示
            var feedback = document.getElementById('feedback');
            if (feedback) {
                feedback.textContent = '🤖 巩固练习模式 · 共10题 · 完成全部巩固错题知识';
                feedback.className = 'feedback correct';
            }
        },

        // ---------- 事件绑定 ----------

        /**
         * 绑定所有事件
         */
        bindEvents: function() {
            var self = this;

            // 年级选项卡点击
            var gradeTabs = document.getElementById('gradeTabs');
            if (gradeTabs) {
                gradeTabs.addEventListener('click', function(e) {
                    var btn = e.target.closest('.grade-tab');
                    if (!btn) return;

                    var tabs = gradeTabs.querySelectorAll('.grade-tab');
                    for (var i = 0; i < tabs.length; i++) {
                        tabs[i].classList.remove('active');
                    }
                    btn.classList.add('active');
                    self.renderTypeList(btn.dataset.category);
                });
            }

            // 题型按钮点击
            var typeList = document.getElementById('typeList');
            if (typeList) {
                typeList.addEventListener('click', function(e) {
                    var btn = e.target.closest('.type-btn');
                    if (!btn) return;

                    var buttons = typeList.querySelectorAll('.type-btn');
                    for (var i = 0; i < buttons.length; i++) {
                        buttons[i].classList.remove('active');
                    }
                    btn.classList.add('active');

                    self.startPractice(btn.dataset.grade, btn.dataset.type);
                    self.renderQuestion();

                    var submitBtn = document.getElementById('submitBtn');
                    if (submitBtn) submitBtn.disabled = false;
                });
            }

            // 提交答案
            var submitBtn = document.getElementById('submitBtn');
            if (submitBtn) {
                submitBtn.addEventListener('click', function() {
                    self.handleSubmit();
                });
            }

            // 下一题
            var nextBtn = document.getElementById('nextBtn');
            if (nextBtn) {
                nextBtn.addEventListener('click', function() {
                    self.nextQuestion();
                    self.renderQuestion();
                    var input = document.getElementById('answerInput');
                    if (input) {
                        input.classList.remove('correct', 'wrong');
                    }
                    var feedback = document.getElementById('feedback');
                    if (feedback) {
                        feedback.textContent = '';
                        feedback.className = 'feedback';
                    }
                });
            }

            // 查看错题
            var toggleWrongBtn = document.getElementById('toggleWrongBtn');
            var wrongPanel = document.getElementById('wrongPanel');
            if (toggleWrongBtn && wrongPanel) {
                toggleWrongBtn.addEventListener('click', function() {
                    var isShown = wrongPanel.classList.contains('show');
                    if (isShown) {
                        wrongPanel.classList.remove('show');
                        toggleWrongBtn.textContent = '查看错题';
                    } else {
                        self.renderWrongList();
                        wrongPanel.classList.add('show');
                        toggleWrongBtn.textContent = '隐藏错题';
                    }
                });
            }

            // AI 巩固练习按钮
            var aiPracticeBtn = document.getElementById('aiPracticeBtn');
            if (aiPracticeBtn) {
                aiPracticeBtn.addEventListener('click', function() {
                    self.generateAiPractice();
                });
            }

            // 回车提交
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    var input = document.getElementById('answerInput');
                    if (input && document.activeElement === input) {
                        self.handleSubmit();
                    }
                }
            });
        },

        /**
         * 处理答案提交
         */
        handleSubmit: function() {
            var input = document.getElementById('answerInput');
            if (!input || !this.currentQuestion) return;

            var userAnswer = input.value.trim();
            if (!userAnswer) return;

            var result = this.checkAnswer(userAnswer);
            this.updateStatsUI();

            if (result.correct) {
                input.classList.add('correct');
                input.classList.remove('wrong');
            } else {
                input.classList.add('wrong');
                input.classList.remove('correct');
            }

            var feedback = document.getElementById('feedback');
            if (feedback) {
                feedback.textContent = result.message;
                feedback.className = 'feedback ' + (result.correct ? 'correct' : 'wrong');
            }

            var submitBtn = document.getElementById('submitBtn');
            if (submitBtn) submitBtn.disabled = true;

            // 答对自动下一题
            if (result.correct) {
                var self = this;
                setTimeout(function() {
                    var nextQ = self.nextQuestion();
                    if (nextQ) self.renderQuestion(nextQ);
                }, 800);
            }

            // AI 巩固练习计数
            if (this.isAiPractice && result.correct) {
                this.aiPracticeCount = (this.aiPracticeCount || 0) + 1;
                if (this.aiPracticeCount >= this.aiPracticeTarget) {
                    this.isAiPractice = false;
                    var feedback = document.getElementById('feedback');
                    if (feedback) {
                        feedback.textContent = '🎉 巩固练习完成！错的题都练会了！';
                        feedback.className = 'feedback correct';
                    }
                }
            }
        },

        // ---------- localStorage 读写 ----------

        /**
         * 从 localStorage 加载状态
         */
        loadState: function() {
            try {
                var saved = localStorage.getItem('mathPractice_state');
                if (saved) {
                    var state = JSON.parse(saved);
                    this.stats = state.stats || this.stats;
                    this.wrongQuestions = state.wrongQuestions || [];
                    if (state.lastGrade) this.lastGrade = state.lastGrade;
                    if (state.lastType) this.lastType = state.lastType;
                }
            } catch (e) {
                console.error('加载状态失败：', e);
            }
        },

        saveState: function() {
            try {
                var state = {
                    stats: this.stats,
                    wrongQuestions: this.wrongQuestions,
                    lastGrade: this.lastGrade,
                    lastType: this.lastType
                };
                localStorage.setItem('mathPractice_state', JSON.stringify(state));
            } catch (e) {
                console.error('保存状态失败：', e);
            }
        },

        // ---------- 练习功能 ----------

        /**
         * 开始练习
         * @param {string} grade - 年级
         * @param {string} type - 题型
         */
        startPractice: function(grade, type, silent) {
            this.currentGrade = grade;
            this.currentType = type;
            this.isPracticing = true;
            // 手动选题时退出巩固模式（silent=true 表示内部调用，不重置）
            if (!silent) this.isAiPractice = false;
            // 记忆上次选择
            this.lastGrade = grade;
            this.lastType = type;
            this.saveState();
            this.startTime = new Date().getTime();
            this.leaveCount = 0;
            this.isPaused = false;
            this.totalPauseTime = 0;
            this.currentSession = {
                grade: grade,
                type: type,
                startTime: this.startTime,
                questions: [],
                correctCount: 0,
                wrongCount: 0
            };
            this.stats.sessionStartTime = this.startTime;
            this.nextQuestion();
        },

        /**
         * 生成下一题
         */
        nextQuestion: function() {
            if (!this.isPracticing) {
                return null;
            }
            // 检查是否已完成所有题目
            if (this.currentSession && this.currentSession.questions.length >= this.questionsPerSession) {
                this.showSummaryPopup();
                return null;
            }
            this.currentQuestion = QuestionGenerator.generate(this.currentGrade, this.currentType);
            this.currentQuestion.id = 'q_' + new Date().getTime() + '_' + randomInt(1000, 9999);
            this.currentQuestion.timestamp = new Date().getTime();
            return this.currentQuestion;
        },

        /**
         * 显示练习完成总结弹窗
         */
        showSummaryPopup: function() {
            var self = this;
            var stats = this.getSessionStats();
            if (!stats) return;

            // 计算用时（分 + 秒格式）
            var mins = Math.floor(stats.sessionTime / 60);
            var secs = stats.sessionTime % 60;

            // 创建遮罩层
            var overlay = document.createElement('div');
            overlay.id = 'summaryOverlay';
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';

            // 创建卡片
            var card = document.createElement('div');
            card.style.cssText = 'background:#fff;border-radius:16px;padding:32px 28px;max-width:360px;width:88%;text-align:center;box-shadow:0 8px 40px rgba(0,0,0,0.25);font-family:"PingFang SC","Microsoft YaHei",sans-serif;';

            // 标题
            var title = document.createElement('div');
            title.style.cssText = 'font-size:24px;font-weight:bold;color:#4CAF50;margin-bottom:18px;';
            title.textContent = '\u2705 \u672C\u6B21\u7EC3\u4E60\u5B8C\u6210';
            card.appendChild(title);

            // 正确率
            var accuracy = document.createElement('div');
            accuracy.style.cssText = 'font-size:18px;color:#333;margin-bottom:12px;';
            accuracy.textContent = '\u6B63\u786E\u7387 ' + stats.accuracy + '%\uFF0C\u5171\u7B54\u5BF9 ' + stats.correctCount + '/' + stats.totalQuestions;
            card.appendChild(accuracy);

            // 用时
            var time = document.createElement('div');
            time.style.cssText = 'font-size:16px;color:#666;margin-bottom:12px;';
            time.textContent = '\u7528\u65F6 ' + mins + ' \u5206 ' + secs + ' \u79D2';
            card.appendChild(time);

            // 错题数量（如有）
            if (stats.wrongCount > 0) {
                var wrong = document.createElement('div');
                wrong.style.cssText = 'font-size:16px;color:#f44336;margin-bottom:12px;';
                wrong.textContent = '\u9519\u9898 ' + stats.wrongCount + ' \u9053';
                card.appendChild(wrong);
            }

            // 再来一组按钮
            var btn = document.createElement('button');
            btn.style.cssText = 'margin-top:18px;padding:10px 36px;font-size:16px;background:#4CAF50;color:#fff;border:none;border-radius:8px;cursor:pointer;font-family:inherit;';
            btn.textContent = '\u518D\u6765\u4E00\u7EC4';
            btn.onclick = function() {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
                self.startPractice(self.currentGrade, self.currentType);
                self.renderQuestion();
                // 启用提交按钮
                var submitBtn = document.getElementById('submitBtn');
                if (submitBtn) submitBtn.disabled = false;
            };
            card.appendChild(btn);

            overlay.appendChild(card);
            document.body.appendChild(overlay);
        },

        /**
         * 检查答案
         * @param {string} userAnswer - 用户输入的答案
         * @returns {object} 结果对象 {correct: boolean, correctAnswer: string, message: string}
         */
        checkAnswer: function(userAnswer) {
            if (!this.currentQuestion) {
                return { correct: false, correctAnswer: '', message: '没有当前题目' };
            }

            var correctAnswer = this.currentQuestion.answer;
            var isCorrect = this.compareAnswers(userAnswer, correctAnswer);

            // 更新统计
            this.stats.totalQuestions++;
            this.currentSession.questions.push({
                question: this.currentQuestion.question,
                correctAnswer: correctAnswer,
                userAnswer: userAnswer,
                isCorrect: isCorrect,
                timestamp: new Date().getTime()
            });

            if (isCorrect) {
                this.stats.correctCount++;
                this.stats.streakCount++;
                if (this.stats.streakCount > this.stats.maxStreak) {
                    this.stats.maxStreak = this.stats.streakCount;
                }
                this.currentSession.correctCount++;
            } else {
                this.stats.wrongCount++;
                this.stats.streakCount = 0;
                this.currentSession.wrongCount++;

                // 记录错题
                this.addWrongQuestion({
                    id: this.currentQuestion.id,
                    question: this.currentQuestion.question,
                    correctAnswer: correctAnswer,
                    userAnswer: userAnswer,
                    type: this.currentType,
                    grade: this.currentGrade,
                    timestamp: new Date().getTime()
                });
            }

            this.saveState();

            return {
                correct: isCorrect,
                correctAnswer: correctAnswer,
                message: isCorrect ? '回答正确！' : '回答错误，正确答案是：' + correctAnswer
            };
        },

        /**
         * 比较答案（处理各种格式）
         */
        compareAnswers: function(userAnswer, correctAnswer) {
            if (!userAnswer || userAnswer === '') return false;

            var user = String(userAnswer).trim();
            var correct = String(correctAnswer).trim();

            // 直接比较
            if (user === correct) return true;

            // 去除空格后比较
            if (user.replace(/\s/g, '') === correct.replace(/\s/g, '')) return true;

            // 尝试数值比较
            var userNum = parseFloat(user);
            var correctNum = parseFloat(correct);
            if (!isNaN(userNum) && !isNaN(correctNum)) {
                return Math.abs(userNum - correctNum) < 0.0001;
            }

            return false;
        },

        // ---------- 错题本功能 ----------

        /**
         * 添加错题
         */
        addWrongQuestion: function(wrongQuestion) {
            // 检查是否已存在相同题目
            var exists = false;
            for (var i = 0; i < this.wrongQuestions.length; i++) {
                if (this.wrongQuestions[i].question === wrongQuestion.question) {
                    exists = true;
                    // 更新错误次数
                    this.wrongQuestions[i].wrongCount = (this.wrongQuestions[i].wrongCount || 1) + 1;
                    this.wrongQuestions[i].lastWrongTime = wrongQuestion.timestamp;
                    this.wrongQuestions[i].userAnswer = wrongQuestion.userAnswer;
                    break;
                }
            }
            if (!exists) {
                wrongQuestion.wrongCount = 1;
                wrongQuestion.lastWrongTime = wrongQuestion.timestamp;
                this.wrongQuestions.push(wrongQuestion);
            }
            this.saveState();
        },

        /**
         * 获取所有错题
         */
        getWrongQuestions: function() {
            return deepCopy(this.wrongQuestions);
        },

        /**
         * 显示错题本
         */
        showWrongQuestions: function() {
            return this.getWrongQuestions();
        },

        /**
         * 删除已掌握的错题
         * @param {string} id - 错题ID
         */
        removeWrongQuestion: function(id) {
            for (var i = 0; i < this.wrongQuestions.length; i++) {
                if (this.wrongQuestions[i].id === id) {
                    this.wrongQuestions.splice(i, 1);
                    this.saveState();
                    return true;
                }
            }
            return false;
        },

        /**
         * 重新练习错题
         * @param {string} id - 错题ID
         */
        practiceWrongQuestion: function(id) {
            for (var i = 0; i < this.wrongQuestions.length; i++) {
                if (this.wrongQuestions[i].id === id) {
                    var wq = this.wrongQuestions[i];
                    this.currentQuestion = {
                        id: wq.id,
                        question: wq.question,
                        answer: wq.correctAnswer,
                        type: wq.type
                    };
                    return this.currentQuestion;
                }
            }
            return null;
        },

        // ---------- 统计功能 ----------

        /**
         * 获取统计信息
         */
        getStats: function() {
            var total = this.stats.totalQuestions;
            var correct = this.stats.correctCount;
            var wrong = this.stats.wrongCount;
            var accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

            var sessionTime = 0;
            if (this.stats.sessionStartTime) {
                sessionTime = Math.floor((new Date().getTime() - this.stats.sessionStartTime) / 1000);
            }

            return {
                totalQuestions: total,
                correctCount: correct,
                wrongCount: wrong,
                accuracy: accuracy,
                streakCount: this.stats.streakCount,
                maxStreak: this.stats.maxStreak,
                sessionTime: sessionTime,
                sessionTimeFormatted: this.formatTime(sessionTime),
                wrongQuestionsCount: this.wrongQuestions.length
            };
        },

        /**
         * 获取本次练习统计
         */
        getSessionStats: function() {
            if (!this.currentSession) {
                return null;
            }

            var total = this.currentSession.questions.length;
            var correct = this.currentSession.correctCount;
            var wrong = this.currentSession.wrongCount;
            var accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

            var sessionTime = 0;
            if (this.currentSession.startTime) {
                sessionTime = Math.floor((new Date().getTime() - this.currentSession.startTime) / 1000);
            }

            return {
                grade: this.currentSession.grade,
                type: this.currentSession.type,
                totalQuestions: total,
                correctCount: correct,
                wrongCount: wrong,
                accuracy: accuracy,
                sessionTime: sessionTime,
                sessionTimeFormatted: this.formatTime(sessionTime),
                questions: deepCopy(this.currentSession.questions)
            };
        },

        /**
         * 获取历史正确率趋势
         */
        getAccuracyTrend: function() {
            var trend = [];
            var batchSize = 10;
            var history = this.currentSession ? this.currentSession.questions : [];

            if (history.length === 0) {
                return trend;
            }

            for (var i = 0; i < history.length; i += batchSize) {
                var batch = history.slice(i, i + batchSize);
                var correct = 0;
                for (var j = 0; j < batch.length; j++) {
                    if (batch[j].isCorrect) correct++;
                }
                var accuracy = batch.length > 0 ? Math.round((correct / batch.length) * 100) : 0;
                trend.push({
                    batchIndex: Math.floor(i / batchSize) + 1,
                    total: batch.length,
                    correct: correct,
                    accuracy: accuracy
                });
            }

            return trend;
        },

        /**
         * 格式化时间（秒 -> 分:秒）
         */
        formatTime: function(seconds) {
            var mins = Math.floor(seconds / 60);
            var secs = seconds % 60;
            return (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
        },

        // ---------- 其他功能 ----------

        /**
         * 结束练习
         */
        endPractice: function() {
            var sessionStats = this.getSessionStats();
            if (sessionStats) {
                this.stats.history.push(sessionStats);
                // 只保留最近50条记录
                if (this.stats.history.length > 50) {
                    this.stats.history.shift();
                }
            }
            this.isPracticing = false;
            this.currentGrade = null;
            this.currentType = null;
            this.currentQuestion = null;
            this.currentSession = null;
            this.stats.sessionStartTime = null;
            this.saveState();
            return sessionStats;
        },

        /**
         * 重置统计
         */
        resetStats: function() {
            this.stats = {
                totalQuestions: 0,
                correctCount: 0,
                wrongCount: 0,
                streakCount: 0,
                maxStreak: 0,
                sessionStartTime: null,
                history: []
            };
            this.saveState();
        },

        /**
         * 清空错题本
         */
        clearWrongQuestions: function() {
            this.wrongQuestions = [];
            this.saveState();
        },

        /**
         * 获取年级结构
         */
        getGradeStructure: function() {
            return deepCopy(GRADE_STRUCTURE);
        },

        /**
         * 获取当前题目
         */
        getCurrentQuestion: function() {
            return this.currentQuestion ? deepCopy(this.currentQuestion) : null;
        }
    };

    // =====================
    // 暴露公共API
    // =====================

    global.MathPractice = MathPractice;
    global.QuestionGenerator = QuestionGenerator;

    // 兼容模块导出
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            MathPractice: MathPractice,
            QuestionGenerator: QuestionGenerator
        };
    }

    // 自动初始化
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                MathPractice.init();
            });
        } else {
            MathPractice.init();
        }
    } else {
        MathPractice.init();
    }

})(typeof window !== 'undefined' ? window : this);
