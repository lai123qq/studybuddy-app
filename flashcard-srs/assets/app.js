/* Recalleum - Spaced Repetition Flashcards (SM-2)
 * v3 - 拆除示例卡组,自带雅思综合词库供一键导入
 */
(function () {
  'use strict';

  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var accent3 = style.getPropertyValue('--accent3').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();

  /* ---------- State ---------- */
  var KEY = 'recalleum_v3';
  var state = loadState();
  // 拆除示例卡组,首次进入给一个空的"我的卡组"占位
  if (!state.decks) {
    state.decks = [{ id: 'default', name: '我的卡组', cards: [] }];
    state.streak = 0; state.lastDay = null;
    state.goalTarget = 20; state.goalDone = 0;
    state.history = [];
    state.dailyLog = {};
    saveState();
  }
  normalizeState();
  // 兼容旧数据(已存在的卡组保留)
  var activeDeckId = state.decks[0].id;
  var studyQueue = [];
  var currentCard = null;
  var isFlipped = false;
  var totalForSession = 0;
  var doneThisSession = 0;
  var toast = document.getElementById('toast');

  function loadState() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } }
  function saveState() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { showToast('本地存储空间不足,请先导出或清理数据', 'warn'); }
  }
  function nid() { return 'c' + Math.random().toString(36).slice(2, 9); }
  function now() { return Date.now(); }
  function todayKey() { return new Date().toISOString().slice(0, 10); }
  function addDays(t, days) { return t + days * 86400 * 1000; }
  function normalizeCard(c) {
    c.ef = typeof c.ef === 'number' ? c.ef : 2.5;
    c.rep = typeof c.rep === 'number' ? c.rep : 0;
    c.interval = typeof c.interval === 'number' ? c.interval : 0;
    c.added = c.added || now();
    c.due = typeof c.due === 'number' ? c.due : now();
    c.lastReview = c.lastReview || null;
    c.skip = !!c.skip;
    return c;
  }
  function normalizeState() {
    state.decks = Array.isArray(state.decks) && state.decks.length ? state.decks : [{ id: 'default', name: '我的卡组', cards: [] }];
    state.decks.forEach(function (d) {
      d.id = d.id || ('d' + Date.now());
      d.name = d.name || '未命名卡组';
      d.cards = Array.isArray(d.cards) ? d.cards.map(normalizeCard) : [];
    });
    state.goalTarget = state.goalTarget || 20;
    state.goalDone = state.goalDone || 0;
    state.history = Array.isArray(state.history) ? state.history : [];
    state.dailyLog = state.dailyLog || {};
  }

  function showToast(text, type) {
    if (!toast) return;
    toast.textContent = text;
    toast.className = 'toast show ' + (type || '');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { toast.classList.remove('show'); }, 2200);
  }

  /* ---------- 雅思综合词库 ----------
   * 来源:豆瓣 / 知乎 / 雅思真题高频词整理,经手工校对。
   * 字段:front = 英文单词,back = 词性 + 中文释义
   */
  /* 小学英语词库(人教版 PEP 1-6 年级,每级 50 词)
   * 字段:front = 英文单词,back = 词性 + 中文释义
   */
  var GRADE_VOCAB = {
    '3上': {
      'Unit 1 学习用品': [['ruler','尺子'],['pencil','铅笔'],['eraser','橡皮'],['crayon','蜡笔'],['bag','包'],['pen','钢笔'],['pencil box','铅笔盒'],['book','书'],['no','不'],['your','你(们)的']],
      'Unit 2 颜色': [['red','红色;红色的'],['green','绿色;绿色的'],['yellow','黄色;黄色的'],['blue','蓝色;蓝色的'],['black','黑色;黑色的'],['brown','棕色;棕色的'],['white','白色;白色的'],['orange','橙色;橙色的'],['OK','好;行']],
      'Unit 3 身体部位': [['face','脸'],['ear','耳朵'],['eye','眼睛'],['nose','鼻子'],['mouth','嘴'],['arm','胳膊'],['hand','手'],['head','头'],['body','身体'],['leg','腿'],['foot','脚']],
      'Unit 4 动物': [['duck','鸭子'],['pig','猪'],['cat','猫'],['bear','熊'],['dog','狗'],['elephant','大象'],['monkey','猴子'],['bird','鸟'],['tiger','老虎'],['panda','大熊猫'],['zoo','动物园'],['funny','滑稽的;好笑的']],
      'Unit 5 食物与饮料': [['bread','面包'],['juice','果汁'],['egg','蛋'],['milk','牛奶'],['water','水'],['cake','蛋糕'],['fish','鱼'],['rice','米饭']],
      'Unit 6 数字1-10': [['one','一'],['two','二'],['three','三'],['four','四'],['five','五'],['six','六'],['seven','七'],['eight','八'],['nine','九'],['ten','十']]
    },
    '3下': {
      'Unit 1 国家与人物': [['UK','英国'],['Canada','加拿大'],['USA','美国'],['China','中国'],['she','她'],['student','学生'],['pupil','小学生'],['he','他'],['teacher','教师'],['boy','男孩'],['and','和;与'],['girl','女孩'],['new','新的'],['friend','朋友'],['today','今天']],
      'Unit 2 家庭成员': [['father','父亲;爸爸'],['dad','(口语)爸爸'],['man','男人'],['woman','女人'],['mother','母亲;妈妈'],['sister','姐;妹'],['brother','兄;弟'],['grandmother','(外)祖母'],['grandma','(口语)(外)祖母'],['grandfather','(外)祖父'],['grandpa','(口语)(外)祖父'],['family','家;家庭']],
      'Unit 3 外貌描述': [['thin','瘦的'],['fat','胖的;肥的'],['tall','高的'],['short','矮的;短的'],['long','长的'],['small','小的'],['big','大的'],['giraffe','长颈鹿'],['so','这么;那么'],['children','儿童']],
      'Unit 4 方位与物品': [['on','在...上'],['in','在...里'],['under','在...下面'],['chair','椅子'],['desk','书桌'],['cap','帽子'],['ball','球'],['car','小汽车'],['boat','小船'],['map','地图'],['toy','玩具'],['box','盒;箱']],
      'Unit 5 水果': [['pear','梨'],['apple','苹果'],['orange','橙子'],['banana','香蕉'],['watermelon','西瓜'],['strawberry','草莓'],['grape','葡萄'],['buy','买']],
      'Unit 6 数字11-20': [['eleven','十一'],['twelve','十二'],['thirteen','十三'],['fourteen','十四'],['fifteen','十五'],['sixteen','十六'],['seventeen','十七'],['eighteen','十八'],['nineteen','十九'],['twenty','二十']]
    },
    '4上': {
      'Unit 1 教室': [['classroom','教室'],['window','窗户'],['blackboard','黑板'],['light','电灯'],['picture','图画'],['door','门'],['computer','计算机'],['fan','风扇'],['wall','墙壁'],['floor','地板']],
      'Unit 2 书包与文具': [['schoolbag','书包'],['maths book','数学书'],['English book','英语书'],['Chinese book','语文书'],['storybook','故事书'],['candy','糖果'],['notebook','笔记本'],['toy','玩具'],['key','钥匙']],
      'Unit 3 人物特征': [['strong','强壮的'],['friendly','友好的'],['quiet','安静的'],['hair','头发'],['shoe','鞋'],['glasses','眼镜'],['his','他的'],['or','或者'],['right','正确的;对的'],['hat','帽子']],
      'Unit 4 家居房间': [['bedroom','卧室'],['living room','客厅'],['study','书房'],['kitchen','厨房'],['bathroom','浴室'],['bed','床'],['phone','电话'],['table','桌子'],['sofa','长沙发'],['fridge','冰箱']],
      'Unit 5 食物与餐具': [['beef','牛肉'],['chicken','鸡肉'],['noodles','面条'],['soup','汤'],['vegetable','蔬菜'],['chopsticks','筷子'],['bowl','碗'],['fork','餐叉'],['knife','刀'],['spoon','勺']],
      'Unit 6 家庭与职业': [['parents','父母'],['cousin','同辈表亲'],['uncle','叔;伯;舅;姑父;姨父'],['aunt','姑母;姨母'],['baby brother','婴儿小弟弟'],['doctor','医生'],['cook','厨师'],['driver','司机'],['farmer','农民'],['nurse','护士']]
    },
    '4下': {
      'Unit 1 学校场所': [['first floor','一楼'],['second floor','二楼'],['library','图书馆'],['playground','操场'],['computer room','计算机房'],['art room','美术教室'],['music room','音乐教室'],['homework','作业'],['class','班;班级'],['forty','四十'],['way','方向']],
      'Unit 2 时间与日常': [['breakfast','早餐'],['lunch','午餐'],['dinner','正餐'],['get up','起床'],['go to school','去上学'],['go home','回家'],['go to bed','上床睡觉'],['over','结束'],['now','现在'],['kid','小孩'],['thirty','三十']],
      'Unit 3 天气': [['cold','寒冷的'],['cool','凉的;凉爽的'],['warm','温暖的'],['hot','热的'],['sunny','阳光充足的'],['windy','多风的'],['cloudy','阴天的;多云的'],['snowy','下雪的'],['rainy','阴雨的;多雨的'],['weather','天气']],
      'Unit 4 农场': [['tomato','西红柿'],['potato','土豆'],['carrot','胡萝卜'],['horse','马'],['cow','母牛;奶牛'],['sheep','羊;绵羊'],['hen','母鸡'],['animal','动物'],['garden','花园;菜园'],['farm','农场'],['goat','山羊']],
      'Unit 5 服装': [['clothes','衣服;服装'],['pants','裤子'],['dress','连衣裙'],['skirt','女裙'],['coat','外衣;大衣'],['sweater','毛衣'],['shorts','短裤'],['jacket','夹克衫'],['shirt','衬衫'],['sock','短袜']],
      'Unit 6 购物': [['glove','手套'],['scarf','围巾'],['umbrella','伞;雨伞'],['sunglasses','太阳镜'],['pretty','美观的;精致的'],['expensive','昂贵的'],['cheap','便宜的'],['nice','好的']]
    },
    '5上': {
      'Unit 1 人物性格': [['old','年老的'],['young','年轻的'],['funny','滑稽的;可笑的'],['kind','体贴的;慈祥的'],['strict','严格的;严厉的'],['polite','有礼貌的'],['hard-working','工作努力的'],['helpful','有用的;愿意帮忙的'],['clever','聪明的'],['shy','羞怯的;腼腆的']],
      'Unit 2 星期与活动': [['Monday','星期一'],['Tuesday','星期二'],['Wednesday','星期三'],['Thursday','星期四'],['Friday','星期五'],['Saturday','星期六'],['Sunday','星期日'],['weekend','周末'],['wash','洗'],['watch','看'],['do','做;干'],['read','读;阅读'],['play','踢;玩']],
      'Unit 3 食物评价': [['sandwich','三明治'],['salad','沙拉'],['hamburger','汉堡包'],['ice cream','冰激凌'],['tea','茶;茶水'],['fresh','新鲜的'],['healthy','健康的'],['delicious','美味的'],['sweet','含糖的;甜的']],
      'Unit 4 才艺与运动': [['sing','唱;唱歌'],['song','歌曲'],['dance','跳舞'],['draw','画'],['cartoon','漫画'],['cook','烹调;烹饪'],['swim','游泳'],['play basketball','打篮球'],['ping-pong','乒乓球']],
      'Unit 5 位置描述': [['clock','时钟;钟'],['plant','植物'],['bottle','瓶子'],['bike','自行车'],['photo','照片;相片'],['front','正面'],['between','在...中间'],['above','在...上面'],['beside','在旁边'],['behind','在...后面']],
      'Unit 6 自然景观': [['forest','森林;林区'],['river','河;江'],['lake','湖;湖泊'],['mountain','高山;山岳'],['hill','山丘;小山'],['tree','树;树木'],['bridge','桥'],['building','建筑物;楼房'],['village','村庄;村镇'],['house','房屋;住宅']]
    },
    '5下': {
      'Unit 1 日常活动': [['eat breakfast','吃早饭'],['play sports','进行体育运动'],['exercise','活动;运动'],['do morning exercises','做早操'],['eat dinner','吃晚饭'],['when','什么时候'],['usually','通常'],['always','总是'],['often','经常'],['sometimes','有时候'],['climb mountains','爬山'],['go shopping','购物'],['play the piano','弹钢琴'],['visit grandparents','看望祖父母'],['go hiking','去远足']],
      'Unit 2 四季': [['spring','春天'],['summer','夏天'],['autumn','秋天'],['winter','冬天'],['season','季节'],['best','最;极'],['snow','雪'],['leaf','叶子'],['which','哪一个'],['why','为什么'],['because','因为'],['sleep','睡觉']],
      'Unit 3 月份与序数词': [['January','一月'],['February','二月'],['March','三月'],['April','四月'],['May','五月'],['June','六月'],['July','七月'],['August','八月'],['September','九月'],['October','十月'],['November','十一月'],['December','十二月'],['birthday','生日'],['first','第一'],['second','第二'],['third','第三'],['fourth','第四'],['fifth','第五'],['twelfth','第十二'],['twentieth','第二十']],
      'Unit 4 现在进行时': [['draw pictures','画画'],['cook dinner','做饭'],['read a book','看书'],['answer the phone','接电话'],['talk','讲话'],['listen to music','听音乐'],['clean the room','打扫房间'],['write a letter','写信'],['write an e-mail','写电子邮件']],
      'Unit 5 动物动作': [['fly','飞'],['jump','跳'],['walk','走'],['run','跑'],['swim','游泳'],['kangaroo','袋鼠'],['trunk','象鼻'],['climb','往上爬'],['fight','打架'],['swing','荡秋千'],['drink water','喝水']],
      'Unit 6 户外活动': [['take pictures','照相'],['watch insects','观察昆虫'],['pick up leaves','采摘树叶'],['do an experiment','做实验'],['catch butterflies','捉蝴蝶'],['woods','树林'],['ant','蚂蚁'],['interesting','有趣的'],['honey','蜂蜜'],['collect leaves','收集树叶'],['have a picnic','举行野餐']]
    },
    '6上': {
      'Unit 1 问路与场所': [['science','科学'],['museum','博物馆'],['post office','邮局'],['bookstore','书店'],['cinema','电影院'],['hospital','医院'],['crossing','十字路口'],['turn','转弯'],['left','左'],['straight','笔直地'],['right','右']],
      'Unit 2 交通方式': [['on foot','步行'],['by','乘(表示方式)'],['bus','公共汽车'],['plane','飞机'],['taxi','出租汽车'],['ship','(大)船'],['subway','地铁'],['train','火车'],['slow','慢的'],['slow down','慢下来']],
      'Unit 3 计划与购物': [['visit','拜访'],['film','电影'],['see a film','看电影'],['trip','旅行'],['take a trip','去旅行'],['supermarket','超市'],['evening','晚上;傍晚'],['tonight','在今晚'],['tomorrow','明天'],['next week','下周'],['dictionary','词典'],['comic book','连环画册'],['word book','单词书'],['postcard','明信片']],
      'Unit 4 爱好': [['studies','学习(三单)'],['puzzle','谜'],['hiking','远足'],['pen pal','笔友'],['hobby','业余爱好'],['idea','想法;主意'],['amazing','令人惊奇的'],['goal','射门'],['join','加入'],['club','俱乐部'],['share','分享']],
      'Unit 5 职业': [['factory','工厂'],['worker','工人'],['postman','邮递员'],['businessman','商人;企业家'],['police officer','警察'],['fisherman','渔民'],['scientist','科学家'],['pilot','飞行员'],['coach','教练']],
      'Unit 6 情绪与感受': [['angry','生气的'],['afraid','害怕的'],['sad','难过的'],['worried','担心的'],['happy','高兴的'],['see a doctor','看病'],['wear','穿'],['more','更多的'],['deep','深的'],['breath','呼吸'],['count','数数']]
    },
    '6下': {
      'Unit 1 比较级': [['taller','更高的'],['shorter','更矮的;更短的'],['stronger','更强壮的'],['older','年龄更大的'],['younger','更年轻的'],['than','与...相比较'],['little','小的'],['tail','尾巴'],['think','想;思考'],['bigger','更大的'],['heavier','更重的'],['longer','更长的'],['thinner','更瘦的'],['smaller','更小的'],['size','号码;尺码']],
      'Unit 2 健康与就医': [['have a fever','发烧'],['hurt','疼痛'],['have a cold','感冒'],['have a toothache','牙疼'],['have a headache','头疼'],['matter','事情;麻烦'],['sore','疼的'],['feel','感觉'],['sick','不舒服的;有病的'],['people','人们'],['flu','流感'],['know','知道'],['worry','烦恼;担忧'],['medicine','药'],['drink','饮料'],['stay','在;逗留'],['better','更好的'],['soon','立刻;不久'],['tired','疲劳的'],['excited','兴奋的'],['bored','无聊的']],
      'Unit 3 过去式动词': [['watched','看(过去式)'],['washed','洗(过去式)'],['cleaned','打扫(过去式)'],['played','玩(过去式)'],['visited','看望(过去式)'],['did','做(过去式)'],['went','去(过去式)'],['went swimming','去游泳(过去式)'],['read','读(过去式)'],['went fishing','去钓鱼(过去式)'],['went hiking','去郊游(过去式)'],['yesterday','昨天'],['studied','学习(过去式)'],['flew','飞(过去式)'],['swam','游泳(过去式)'],['last','上一个']],
      'Unit 4 假期旅行': [['learn','学习'],['Chinese','语文'],['sing','唱歌'],['dance','跳舞'],['eat','吃'],['good','好的'],['take','拍照'],['climb','爬'],['have','有'],['buy','买'],['present','礼物'],['row','划(船)'],['boat','船'],['see','看见'],['elephant','大象'],['how','怎么;如何'],['leave','离开'],['get','到达']],
      'Unit 5 职业复习': [['factory','工厂'],['worker','工人'],['postman','邮递员'],['businessman','商人'],['police officer','警察'],['fisherman','渔民'],['scientist','科学家'],['pilot','飞行员'],['coach','教练'],['country','国家'],['head teacher','校长']],
      'Unit 6 故事与情感': [['angry','生气的'],['afraid','害怕的'],['sad','难过的'],['worried','担心的'],['happy','高兴的'],['see a doctor','看病'],['wear','穿'],['more','更多的'],['deep','深的'],['breath','呼吸'],['count','数数'],['chase','追赶'],['mouse','老鼠'],['bad','坏的'],['ill','有病;不舒服']]
    }
  };

  /* 初中英语词库(人教版新目标 7-9年级) */
  var MIDDLE_VOCAB = {
    '7上': {
      'Starter Unit 1 打招呼': [['greet','招呼;问候'],['conversation','谈话;交谈'],['spell','用字母拼;拼写'],['each other','互相;彼此'],['start','开始;着手']],
      'Starter Unit 2 物品识别': [['bottle','瓶子'],['eraser','橡皮'],['key','钥匙'],['thing','东西;事情'],['need','需要']],
      'Starter Unit 3 颜色': [['color','颜色'],['yellow','黄色'],['red','红色'],['green','绿色'],['blue','蓝色'],['black','黑色'],['white','白色'],['brown','棕色'],['purple','紫色']],
      'Unit 1 新朋友': [['make friends','交朋友'],['get to know','认识;了解'],['full name','全名'],['last name','姓'],['classmate','同班同学']],
      'Unit 2 家庭': [['mean','意思是;打算'],['husband','丈夫'],['grandparent','祖父(母);外祖父(母)'],['together','在一起;共同'],['spend','花(时间、钱)']],
      'Unit 3 校园': [['hall','大厅;礼堂'],['dining hall','餐厅'],['building','建筑物;楼房'],['across','过;穿过'],['centre','中心;中央']],
      'Unit 4 我的最爱': [['favourite','特别喜爱的'],['subject','学科;科目'],['biology','生物学'],['geography','地理(学)'],['history','历史']],
      'Unit 5 有趣的一天': [['wake up','醒来;唤醒'],['o\'clock','...点钟'],['half','一半'],['past','晚于;过'],['quarter','一刻钟']],
      'Unit 6 一天': [['exercise','锻炼;练习'],['activity','活动'],['homework','家庭作业'],['dinner','晚餐;正餐'],['housework','家务劳动']],
      'Unit 7 生日快乐': [['celebrate','庆祝;庆贺'],['something','某事;某物'],['kite','风筝'],['candle','蜡烛'],['wish','愿望;希望']]
    },
    '7下': {
      'Unit 1 动物朋友': [['fox','狐狸'],['giraffe','长颈鹿'],['eagle','鹰'],['wolf','狼'],['penguin','企鹅'],['care for','照顾;照料'],['sandwich','三明治'],['snake','蛇']],
      'Unit 2 日常作息': [['daily','每日的;日常的'],['routine','常规;惯例'],['while','在...期间'],['usually','通常地'],['prepare','准备']],
      'Unit 3 保持健康': [['fit','健康的'],['jog','慢跑'],['skateboard','滑板'],['barely','几乎不'],['once','一次']],
      'Unit 4 健康饮食': [['bean','豆;豆荚'],['tofu','豆腐'],['onion','洋葱'],['pepper','甜椒;辣椒'],['mushroom','蘑菇'],['dumpling','饺子']],
      'Unit 5 旧物': [['yard','院子'],['yard sale','庭院拍卖会'],['sweet','甜的'],['memory','回忆;记忆'],['cent','分(货币单位)']],
      'Unit 6 天气': [['dry','干燥的'],['wet','潮湿的'],['temperature','温度'],['degree','度;度数'],['could','能;可以']],
      'Unit 7 有趣的地方': [['square','广场'],['meter','米;公尺'],['kilometer','千米;公里'],['population','人口'],['guide','导游;向导']],
      'Unit 8 讲故事': [['once upon a time','从前'],['stepmother','继母'],['prince','王子'],['fairy','仙子;小精灵'],['magic','有魔力的']]
    },
    '8上': {
      'Unit 1 你去哪儿度假': [['anyone','任何人'],['anywhere','在任何地方'],['wonderful','精彩的'],['few','不多;很少'],['most','最多;大多数']],
      'Unit 2 你多久锻炼一次': [['housework','家务劳动'],['hardly','几乎不'],['ever','在任何时候'],['once','一次'],['twice','两次']],
      'Unit 3 我比我妹妹更外向': [['outgoing','外向的'],['better','更好的;较好地'],['loudly','大声地'],['quietly','轻声地'],['hard-working','工作努力的']],
      'Unit 4 最好的电影院': [['theater','戏院;剧场'],['comfortable','使人舒服的;舒适的'],['seat','座位;坐处'],['screen','银幕;屏幕'],['close','接近']],
      'Unit 5 你想看游戏节目吗': [['sitcom','情景喜剧'],['news','新闻;新闻节目'],['soap opera','肥皂剧'],['educational','教育的;有教育意义的'],['plan','打算;计划']],
      'Unit 6 我打算学习计算机科学': [['computer programmer','计算机程序设计员'],['cook','厨师'],['doctor','医生'],['engineer','工程师'],['violinist','小提琴手']],
      'Unit 7 人们将来会有机器人吗': [['paper','纸;纸张'],['pollution','污染;污染物'],['prediction','预言;预测'],['future','将来;未来'],['environment','环境']],
      'Unit 8 你怎么做香蕉奶昔': [['shake','摇动;抖动'],['blender','搅拌机'],['peel','剥皮;去皮'],['pour','倒出;倾倒'],['yogurt','酸奶']],
      'Unit 9 你能来参加我的派对吗': [['prepare','使做好准备;把...准备好'],['prepare for','为...做准备'],['available','有空的;可获得的'],['catch','及时赶上;接住'],['invitation','邀请;请柬']],
      'Unit 10 如果你去参加派对，你会玩得很开心': [['meeting','会议;集会'],['video','录像带;录像'],['organize','组织;筹备'],['potato chips','炸土豆片'],['chocolate','巧克力']]
    },
    '8下': {
      'Unit 1 怎么了': [['stomachache','胃痛;腹痛'],['foot','脚;足'],['neck','颈;脖子'],['stomach','胃;腹部'],['fever','发烧']],
      'Unit 2 我来打扫城市公园': [['cheer','欢呼;喝彩'],['cheer up','(使)变得更高兴;振奋起来'],['give out','分发;散发'],['clean up','打扫(或清除)干净'],['come up with','想出;提出']],
      'Unit 3 你能打扫你的房间吗': [['rubbish','垃圾;废物'],['fold','折叠;对折'],['sweep','扫;打扫'],['floor','地板'],['mess','杂乱;不整洁']],
      'Unit 4 你为什么不做对话': [['allow','允许;准许'],['wrong','有毛病;错误的'],['midnight','午夜;子夜'],['guess','猜测;估计'],['deal','协议;交易']],
      'Unit 5 暴风雨来临时你在做什么': [['rainstorm','暴风雨'],['alarm','闹钟'],['begin','开始'],['heavily','在很大程度上;大量地'],['suddenly','突然;忽然']],
      'Unit 6 愚公移山': [['shoot','射击;发射'],['stone','石头'],['weak','虚弱的;无力的'],['god','神;上帝'],['remind','提醒;使想起']],
      'Unit 7 世界上最高的山是什么': [['square','平方;正方形'],['meter','米;公尺'],['deep','深的'],['desert','沙漠'],['population','人口']],
      'Unit 8 你读过金银岛吗': [['treasure','珠宝;财富'],['island','岛'],['classic','经典作品;名著'],['page','(书或纸张的)页'],['hurry','匆忙;赶快']],
      'Unit 9 你去过博物馆吗': [['amusement','娱乐;游戏'],['amusement park','游乐园'],['somewhere','在某处;到某处'],['camera','照相机;摄影机'],['invention','发明;发明物']],
      'Unit 10 我有过这个自行车三年了': [['yard','院子'],['yard sale','庭院拍卖会'],['sweet','甜的'],['memory','回忆;记忆'],['cent','分(货币单位)']]
    },
    '9全': {
      'Unit 1 如何成为一名成功的学习者': [['textbook','教科书;课本'],['conversation','谈话;交谈'],['aloud','大声地;出声地'],['sentence','句子'],['patient','有耐心的']],
      'Unit 2 我认为月亮饼很美味': [['stranger','陌生人'],['relative','亲属;亲戚'],['pound','磅(重量单位)'],['garden','花园;菜园'],['admire','欣赏;仰慕']],
      'Unit 3 洗手间在哪里': [['stamp','邮票;印章'],['bookstore','书店'],['beside','在旁边;在附近'],['postcard','明信片'],['pardon','原谅;请再说一遍']],
      'Unit 4 我曾经害怕黑暗': [['humorous','有幽默感的;滑稽有趣的'],['silent','不说话的;沉默的'],['helpful','有用的;有帮助的'],['from time to time','时常;有时'],['score','得分;进球']],
      'Unit 5 你知道茶是被谁发明的吗': [['national','国家的;民族的'],['trade','贸易;交易'],['pleasure','高兴;愉快'],['leaf','叶;叶子'],['discovery','发现']],
      'Unit 6 你什么时候发明的电话': [['style','样式;款式'],['project','项目;工程'],['pleasure','高兴;愉快'],['daily','每日的;日常的'],['website','网站']],
      'Unit 7 青少年应该被允许选择自己的衣服': [['smoke','吸烟;抽烟'],['pierce','扎;刺破'],['license','证;证件'],['safety','安全;安全性'],['earring','耳环']],
      'Unit 8 它一定属于卡拉': [['whose','谁的'],['truck','卡车;货车'],['rabbit','兔;野兔'],['attend','出席;参加'],['valuable','贵重的;很有用的']],
      'Unit 9 我喜欢我能跟着跳舞的音乐': [['prefer','更喜爱;偏爱'],['lyrics','歌词'],['Australian','澳大利亚的'],['electronic','电子的'],['suppose','推断;料想']],
      'Unit 10 你 supposed 在下雨时敲门': [['custom','风俗;习俗'],['bow','鞠躬'],['kiss','亲吻;接吻'],['greet','和...打招呼;迎接'],['value','重视;珍视']],
      'Unit 11 悲伤的电影让我哭泣': [['friendship','友谊;友情'],['king','国王;君主'],['power','力量;权力'],['prime','首要的;基本的'],['minister','大臣;部长']],
      'Unit 12 生活充满了意外': [['unexpected','出乎意料的'],['backpack','背包;旅行包'],['oversleep','睡过头;睡得过久'],['give...a lift','捎...一程'],['miss','错过;未得到']],
      'Unit 13 我们正在努力拯救地球': [['litter','垃圾;废弃物'],['bottom','底部;最下部'],['fisherman','渔民;钓鱼的人'],['coal','煤;煤块'],['advantage','优点;有利条件']],
      'Unit 14 我记得在七年级遇见你们所有人': [['standard','标准;水平'],['row','一排;一列'],['keyboard','键盘'],['instruction','指示;命令'],['double','加倍;是...的两倍']]
    }
  };

  var MIDDLE_LABEL_MAP = { '7上':'七年级上', '7下':'七年级下', '8上':'八年级上', '8下':'八年级下', '9全':'九年级全' };

  /* 雅思词库(高频核心词保留,下方继续合并扩展词) */
  var IELTS_VOCAB = [
    ['accelerate', 'v. 加速;促进'],
    ['access', 'n./v. 接近;访问;通道'],
    ['adapt', 'v. 适应;改编'],
    ['alter', 'v. 改变;修改'],
    ['ancient', 'adj. 古代的;古老的'],
    ['apply', 'v. 申请;应用;适用'],
    ['auditory', 'adj. 听觉的;耳朵的'],
    ['appropriate', 'adj. 适当的;合适的'],
    ['artificial', 'adj. 人造的;人工的'],
    ['approach', 'n./v. 方法;接近'],
    ['beneficial', 'adj. 有益的;有利的'],
    ['conscious', 'adj. 意识到的;有意识的'],
    ['criteria', 'n. 标准;准则(criterion 的复数)'],
    ['curriculum', 'n. 课程;总课程'],
    ['delivery', 'n. 递送;演讲风格;分娩'],
    ['demanding', 'adj. 苛求的;要求高的'],
    ['depend on', 'v. 依赖;取决于'],
    ['deserve', 'v. 应得;值得'],
    ['disorder', 'n. 混乱;失调;疾病'],
    ['distant', 'adj. 遥远的;疏远的'],
    ['domestic', 'adj. 本国的;家用的;驯养的'],
    ['dormitory', 'n. 宿舍'],
    ['ease', 'n./v. 容易;减轻;缓和'],
    ['ecology', 'n. 生态学;生态环境'],
    ['economy', 'n. 经济;节约'],
    ['emerge', 'v. 出现;浮现;暴露'],
    ['emphasis', 'n. 强调;重点'],
    ['endure', 'v. 忍耐;持久'],
    ['enhance', 'v. 提高;增强'],
    ['enormous', 'adj. 巨大的;庞大的'],
    ['ensure', 'v. 确保;保证'],
    ['entire', 'adj. 全部的;整个的'],
    ['environment', 'n. 环境;周围状况'],
    ['essential', 'adj. 必要的;本质的'],
    ['evaluate', 'v. 评价;评估'],
    ['evidence', 'n. 证据;迹象'],
    ['exact', 'adj. 精确的;确切的'],
    ['examine', 'v. 检查;调查;考试'],
    ['exception', 'n. 例外;异议'],
    ['exhibit', 'v./n. 展览;展示;展品'],
    ['exist', 'v. 存在;生存'],
    ['expand', 'v. 扩大;扩展;详述'],
    ['expect', 'v. 期望;预计'],
    ['experience', 'n./v. 经验;经历'],
    ['experiment', 'n./v. 实验;试验'],
    ['explore', 'v. 探索;勘探;探险'],
    ['expose', 'v. 暴露;揭露;使接触'],
    ['factor', 'n. 因素;因子'],
    ['feature', 'n. 特征;特色;特写'],
    ['fertile', 'adj. 肥沃的;多产的'],
    ['flexible', 'adj. 灵活的;柔韧的'],
    ['flourish', 'v. 繁荣;茂盛;挥舞'],
    ['former', 'adj./n. 以前的;前者'],
    ['frequent', 'adj. 频繁的;常见的'],
    ['fundamental', 'adj. 基本的;根本的'],
    ['generation', 'n. 一代;产生;世代'],
    ['genuine', 'adj. 真正的;真诚的'],
    ['global', 'adj. 全球的;全面的'],
    ['gradually', 'adv. 逐渐地'],
    ['guarantee', 'v./n. 保证;担保'],
    ['handle', 'v. 处理;操作;n. 把手'],
    ['hesitate', 'v. 犹豫;迟疑'],
    ['identify', 'v. 识别;确定;认同'],
    ['ignore', 'v. 忽视;不理睬'],
    ['imply', 'v. 暗示;意味'],
    ['impose', 'v. 征(税);把…强加于'],
    ['improve', 'v. 改善;提高'],
    ['include', 'v. 包括;包含'],
    ['income', 'n. 收入;收益'],
    ['increase', 'v./n. 增加;增长'],
    ['indicate', 'v. 表明;指示'],
    ['industrial', 'adj. 工业的;产业的'],
    ['influence', 'n./v. 影响;感化'],
    ['inherit', 'v. 继承;遗传'],
    ['innovation', 'n. 创新;革新'],
    ['insight', 'n. 洞察力;领悟'],
    ['inspire', 'v. 激发;鼓舞'],
    ['instant', 'adj./n. 立即的;瞬间'],
    ['integrate', 'v. 整合;使一体化'],
    ['intense', 'adj. 强烈的;紧张的'],
    ['interact', 'v. 相互作用;互动'],
    ['interpret', 'v. 解释;翻译;演绎'],
    ['intervene', 'v. 干涉;干预;介入'],
    ['investigate', 'v. 调查;研究'],
    ['isolate', 'v. 隔离;孤立'],
    ['judge', 'n./v. 法官;判断;审判'],
    ['labour', 'n. 劳动;工人;分娩'],
    ['launch', 'v. 发射;发起;推出'],
    ['legal', 'adj. 合法的;法律的'],
    ['logic', 'n. 逻辑;逻辑学'],
    ['maintain', 'v. 维持;保养;坚持'],
    ['mature', 'adj. 成熟的;成年的'],
    ['measure', 'n./v. 测量;措施'],
    ['minor', 'adj. 较小的;次要的'],
    ['modest', 'adj. 谦虚的;适度的'],
    ['motivate', 'v. 激发;激励'],
    ['negotiate', 'v. 谈判;协商'],
    ['negotiation', 'n. 谈判;协商'],
    ['object', 'n./v. 物体;反对'],
    ['obtain', 'v. 获得;得到'],
    ['obvious', 'adj. 明显的;显著的']
  ];

  var IELTS_EXTRA_VOCAB = [
    ['abandon', 'v. 放弃;遗弃'], ['abolish', 'v. 废除;取消'], ['abstract', 'adj. 抽象的;n. 摘要'],
    ['abundant', 'adj. 丰富的;充足的'], ['academy', 'n. 学院;学术机构'], ['accommodation', 'n. 住宿;调节'],
    ['accompany', 'v. 陪伴;伴随'], ['accomplish', 'v. 完成;实现'], ['account for', 'v. 解释;占比例'],
    ['accurate', 'adj. 准确的'], ['accumulate', 'v. 积累;堆积'], ['acknowledge', 'v. 承认;感谢'],
    ['acquire', 'v. 获得;习得'], ['acute', 'adj. 严重的;敏锐的'], ['adequate', 'adj. 足够的;合格的'],
    ['adjacent', 'adj. 相邻的'], ['adjust', 'v. 调整;适应'], ['administration', 'n. 管理;行政部门'],
    ['adolescent', 'n./adj. 青少年;青春期的'], ['advocate', 'v./n. 提倡;拥护者'], ['aesthetic', 'adj. 审美的'],
    ['affect', 'v. 影响'], ['affluent', 'adj. 富裕的'], ['agriculture', 'n. 农业'],
    ['allocate', 'v. 分配;拨给'], ['alternative', 'n./adj. 替代方案;可替代的'], ['ambiguous', 'adj. 模棱两可的'],
    ['amend', 'v. 修改;修正'], ['analogy', 'n. 类比'], ['analyse', 'v. 分析'],
    ['annual', 'adj. 每年的;n. 年刊'], ['anticipate', 'v. 预期;期待'], ['apparent', 'adj. 明显的;表面上的'],
    ['appendix', 'n. 附录;阑尾'], ['appreciate', 'v. 欣赏;感激;升值'], ['arbitrary', 'adj. 任意的;专断的'],
    ['archaeology', 'n. 考古学'], ['architecture', 'n. 建筑;建筑学'], ['array', 'n. 大量;排列'],
    ['assemble', 'v. 集合;组装'], ['assess', 'v. 评估'], ['assign', 'v. 分配;指定'],
    ['assist', 'v. 帮助'], ['assume', 'v. 假定;承担'], ['astonishing', 'adj. 令人惊讶的'],
    ['attribute', 'v. 归因于;n. 属性'], ['authority', 'n. 权威;当局'], ['automate', 'v. 自动化'],
    ['available', 'adj. 可获得的;有空的'], ['aware', 'adj. 意识到的'], ['barrier', 'n. 障碍;屏障'],
    ['behaviour', 'n. 行为'], ['bias', 'n. 偏见;倾向'], ['biodiversity', 'n. 生物多样性'],
    ['biological', 'adj. 生物的'], ['boost', 'v./n. 促进;提高'], ['boundary', 'n. 边界'],
    ['capacity', 'n. 能力;容量'], ['category', 'n. 类别'], ['cease', 'v. 停止'],
    ['challenge', 'n./v. 挑战'], ['characteristic', 'n./adj. 特征;典型的'], ['chronological', 'adj. 按时间顺序的'],
    ['circumstance', 'n. 情况;环境'], ['cite', 'v. 引用;列举'], ['civilisation', 'n. 文明'],
    ['clarify', 'v. 澄清;阐明'], ['classify', 'v. 分类'], ['climate', 'n. 气候'],
    ['coherent', 'adj. 连贯的;一致的'], ['coincide', 'v. 同时发生;一致'], ['collapse', 'v./n. 崩溃;倒塌'],
    ['colleague', 'n. 同事'], ['commence', 'v. 开始'], ['commission', 'n. 委员会;佣金'],
    ['commodity', 'n. 商品;有用之物'], ['communicate', 'v. 交流;传达'], ['community', 'n. 社区;群体'],
    ['compatible', 'adj. 兼容的;相容的'], ['compensate', 'v. 补偿'], ['compile', 'v. 编制;汇编'],
    ['complex', 'adj. 复杂的;n. 综合体'], ['component', 'n. 组成部分'], ['compound', 'n. 化合物;复合物'],
    ['comprehensive', 'adj. 全面的;综合的'], ['comprise', 'v. 包含;由…组成'], ['concentrate', 'v. 集中;浓缩'],
    ['concept', 'n. 概念'], ['concise', 'adj. 简明的'], ['conclude', 'v. 结论;结束'],
    ['conduct', 'v. 进行;指挥;n. 行为'], ['confirm', 'v. 确认;证实'], ['conflict', 'n./v. 冲突'],
    ['conform', 'v. 遵守;符合'], ['consequence', 'n. 结果;后果'], ['conserve', 'v. 保存;保护'],
    ['considerable', 'adj. 相当大的'], ['consistent', 'adj. 一致的;持续的'], ['constitute', 'v. 构成;组成'],
    ['constrain', 'v. 限制;约束'], ['construct', 'v. 建造;构建'], ['consume', 'v. 消耗;消费'],
    ['contaminate', 'v. 污染'], ['contemporary', 'adj. 当代的;同时期的'], ['context', 'n. 背景;语境'],
    ['contradict', 'v. 反驳;矛盾'], ['contrast', 'n./v. 对比'], ['contribute', 'v. 贡献;导致'],
    ['controversial', 'adj. 有争议的'], ['conventional', 'adj. 传统的;常规的'], ['convert', 'v. 转变;转换'],
    ['convince', 'v. 使相信'], ['cooperate', 'v. 合作'], ['coordinate', 'v./n. 协调;坐标'],
    ['core', 'n./adj. 核心;核心的'], ['correlate', 'v. 相关联'], ['correspond', 'v. 符合;通信'],
    ['crucial', 'adj. 关键的'], ['cultivate', 'v. 培养;耕作'], ['decline', 'v./n. 下降;衰退'],
    ['deduce', 'v. 推断'], ['deficiency', 'n. 缺乏;不足'], ['define', 'v. 定义;明确'],
    ['demonstrate', 'v. 证明;展示'], ['dense', 'adj. 密集的;浓厚的'], ['derive', 'v. 获得;起源于'],
    ['detect', 'v. 发现;探测'], ['deteriorate', 'v. 恶化'], ['device', 'n. 装置;设备'],
    ['devote', 'v. 致力于;奉献'], ['differentiate', 'v. 区分'], ['dimension', 'n. 维度;方面'],
    ['diminish', 'v. 减少;削弱'], ['discrete', 'adj. 分离的;离散的'], ['discriminate', 'v. 区分;歧视'],
    ['displace', 'v. 取代;迫使离开'], ['display', 'v./n. 展示;显示'], ['dispose', 'v. 处理;布置'],
    ['distinct', 'adj. 明显不同的;清晰的'], ['distort', 'v. 扭曲;歪曲'], ['diverse', 'adj. 多样的'],
    ['dominant', 'adj. 占主导的'], ['draft', 'n./v. 草稿;起草'], ['duration', 'n. 持续时间'],
    ['dynamic', 'adj. 动态的;有活力的'], ['eliminate', 'v. 消除;淘汰'], ['empirical', 'adj. 经验主义的;实证的'],
    ['enable', 'v. 使能够'], ['encounter', 'v./n. 遇到;遭遇'], ['engage', 'v. 参与;吸引'],
    ['enforce', 'v. 执行;强制'], ['entity', 'n. 实体'], ['equivalent', 'adj./n. 等同的;等价物'],
    ['erode', 'v. 侵蚀;削弱'], ['establish', 'v. 建立;确立'], ['estimate', 'v./n. 估计'],
    ['ethical', 'adj. 伦理的'], ['evolve', 'v. 进化;发展'], ['exceed', 'v. 超过'],
    ['exclude', 'v. 排除;不包括'], ['exploit', 'v. 利用;开发;剥削'], ['external', 'adj. 外部的'],
    ['extract', 'v./n. 提取;摘录'], ['facilitate', 'v. 促进;使便利'], ['finite', 'adj. 有限的'],
    ['fluctuate', 'v. 波动'], ['focus', 'n./v. 焦点;集中'], ['foundation', 'n. 基础;基金会'],
    ['framework', 'n. 框架;体系'], ['function', 'n./v. 功能;运作'], ['generate', 'v. 产生'],
    ['genetic', 'adj. 基因的;遗传的'], ['geographical', 'adj. 地理的'], ['hierarchy', 'n. 等级制度'],
    ['highlight', 'v. 强调;突出'], ['hypothesis', 'n. 假设'], ['identical', 'adj. 完全相同的'],
    ['illustrate', 'v. 说明;阐明'], ['immense', 'adj. 巨大的'], ['impact', 'n./v. 影响;冲击'],
    ['implement', 'v. 实施;执行'], ['implication', 'n. 含义;影响'], ['incentive', 'n. 激励;诱因'],
    ['incidence', 'n. 发生率'], ['inevitable', 'adj. 不可避免的'], ['infrastructure', 'n. 基础设施'],
    ['inherent', 'adj. 固有的'], ['initial', 'adj. 最初的;n. 首字母'], ['initiate', 'v. 开始;发起'],
    ['input', 'n. 输入;投入'], ['instinct', 'n. 本能'], ['institution', 'n. 机构;制度'],
    ['instruction', 'n. 指示;教学'], ['intelligent', 'adj. 聪明的;智能的'], ['internal', 'adj. 内部的'],
    ['justify', 'v. 证明…合理'], ['labour force', 'n. 劳动力'], ['legislation', 'n. 法律;立法'],
    ['levy', 'n./v. 税;征收'], ['likewise', 'adv. 同样地'], ['link', 'n./v. 连接;关联'],
    ['locate', 'v. 定位;位于'], ['magnitude', 'n. 巨大;重要性'], ['manual', 'adj. 手工的;n. 手册'],
    ['margin', 'n. 边缘;利润'], ['maximize', 'v. 最大化'], ['mechanism', 'n. 机制;机械装置'],
    ['mediate', 'v. 调解;影响'], ['migration', 'n. 迁移;移民'], ['minimum', 'n./adj. 最小值;最低的'],
    ['modify', 'v. 修改;调整'], ['monitor', 'v./n. 监测;显示器'], ['mutual', 'adj. 相互的;共同的'],
    ['network', 'n. 网络'], ['neutral', 'adj. 中立的'], ['nevertheless', 'adv. 然而'],
    ['notion', 'n. 概念;想法'], ['objective', 'n./adj. 目标;客观的'], ['occupy', 'v. 占据;占用'],
    ['occur', 'v. 发生;出现'], ['offset', 'v./n. 抵消;补偿'], ['ongoing', 'adj. 持续的'],
    ['option', 'n. 选择'], ['output', 'n. 产出;输出'], ['overall', 'adj./adv. 总体的;总体上'],
    ['overlap', 'v./n. 重叠'], ['panel', 'n. 专家组;面板'], ['paradigm', 'n. 范式;典范'],
    ['parameter', 'n. 参数;限制因素'], ['participate', 'v. 参与'], ['perceive', 'v. 感知;认为'],
    ['period', 'n. 时期;阶段'], ['persist', 'v. 坚持;持续'], ['perspective', 'n. 视角;观点'],
    ['phase', 'n. 阶段'], ['phenomenon', 'n. 现象'], ['policy', 'n. 政策'],
    ['portion', 'n. 部分;份额'], ['pose', 'v. 造成;提出'], ['potential', 'adj./n. 潜在的;潜力'],
    ['precede', 'v. 先于'], ['precise', 'adj. 精确的'], ['predict', 'v. 预测'],
    ['preserve', 'v. 保存;保护'], ['presume', 'v. 假定;推测'], ['previous', 'adj. 先前的'],
    ['primary', 'adj. 主要的;初级的'], ['prime', 'adj. 首要的;n. 全盛期'], ['principle', 'n. 原则;原理'],
    ['priority', 'n. 优先事项'], ['proceed', 'v. 继续进行'], ['process', 'n./v. 过程;处理'],
    ['prohibit', 'v. 禁止'], ['promote', 'v. 促进;提升'], ['proportion', 'n. 比例;部分'],
    ['prospect', 'n. 前景;可能性'], ['protocol', 'n. 协议;礼仪'], ['psychological', 'adj. 心理的'],
    ['pursue', 'v. 追求;从事'], ['qualitative', 'adj. 定性的'], ['quantitative', 'adj. 定量的'],
    ['radical', 'adj. 根本的;激进的'], ['range', 'n./v. 范围;变化'], ['ratio', 'n. 比率'],
    ['rational', 'adj. 理性的;合理的'], ['react', 'v. 反应'], ['recover', 'v. 恢复;找回'],
    ['refine', 'v. 改进;提炼'], ['regime', 'n. 政权;制度'], ['region', 'n. 地区;区域'],
    ['reinforce', 'v. 加强;强化'], ['reject', 'v. 拒绝;驳回'], ['relevant', 'adj. 相关的'],
    ['reluctant', 'adj. 不情愿的'], ['rely on', 'v. 依靠'], ['remove', 'v. 移除;搬迁'],
    ['require', 'v. 需要;要求'], ['research', 'n./v. 研究'], ['reside', 'v. 居住;存在于'],
    ['resolve', 'v. 解决;决定'], ['resource', 'n. 资源'], ['respond', 'v. 回应;反应'],
    ['restore', 'v. 恢复;修复'], ['restrict', 'v. 限制'], ['retain', 'v. 保留;保持'],
    ['reveal', 'v. 揭示;显示'], ['reverse', 'v./adj. 逆转;相反的'], ['revise', 'v. 修改;复习'],
    ['rigid', 'adj. 僵硬的;严格的'], ['role', 'n. 角色;作用'], ['scenario', 'n. 情景;方案'],
    ['schedule', 'n./v. 日程;安排'], ['scheme', 'n. 计划;体系'], ['scope', 'n. 范围'],
    ['sector', 'n. 部门;领域'], ['seek', 'v. 寻找;寻求'], ['sequence', 'n. 顺序;序列'],
    ['shift', 'v./n. 转变;轮班'], ['significant', 'adj. 重要的;显著的'], ['simulate', 'v. 模拟'],
    ['sole', 'adj. 唯一的'], ['somewhat', 'adv. 有点;稍微'], ['source', 'n. 来源;源头'],
    ['specific', 'adj. 具体的;特定的'], ['specify', 'v. 明确说明'], ['stable', 'adj. 稳定的'],
    ['statistic', 'n. 统计数据'], ['status', 'n. 状态;地位'], ['strategy', 'n. 策略'],
    ['structure', 'n./v. 结构;组织'], ['subsequent', 'adj. 随后的'], ['substitute', 'n./v. 替代品;替代'],
    ['sufficient', 'adj. 足够的'], ['sum', 'n./v. 总和;总结'], ['summary', 'n. 摘要;总结'],
    ['survey', 'n./v. 调查;概览'], ['sustain', 'v. 维持;支撑'], ['symbol', 'n. 符号;象征'],
    ['technical', 'adj. 技术的;专业的'], ['technique', 'n. 技术;方法'], ['temporary', 'adj. 临时的'],
    ['theory', 'n. 理论'], ['thereby', 'adv. 因此;由此'], ['topic', 'n. 主题;话题'],
    ['trace', 'n./v. 痕迹;追踪'], ['traditional', 'adj. 传统的'], ['transfer', 'v./n. 转移;调动'],
    ['transform', 'v. 转变;改造'], ['transmit', 'v. 传输;传播'], ['trend', 'n. 趋势'],
    ['trigger', 'v./n. 引发;触发器'], ['ultimate', 'adj. 最终的;根本的'], ['undergo', 'v. 经历;遭受'],
    ['underlie', 'v. 构成…基础'], ['undertake', 'v. 承担;从事'], ['uniform', 'adj. 统一的;n. 制服'],
    ['unique', 'adj. 独特的'], ['valid', 'adj. 有效的;合理的'], ['vary', 'v. 变化;不同'],
    ['version', 'n. 版本;说法'], ['via', 'prep. 通过;经由'], ['virtual', 'adj. 虚拟的;实质上的'],
    ['visible', 'adj. 可见的;明显的'], ['volume', 'n. 体积;卷;音量'], ['welfare', 'n. 福利;幸福'],
    ['whereas', 'conj. 然而;鉴于'], ['widespread', 'adj. 广泛的'], ['yield', 'v./n. 产生;收益'],
    ['absence', 'n. 缺席;缺乏'], ['absorb', 'v. 吸收;吸引'], ['abundance', 'n. 丰富;充裕'],
    ['accent', 'n. 口音;重音'], ['accessible', 'adj. 可进入的;易理解的'], ['acclaim', 'n./v. 称赞;喝彩'],
    ['accomplishment', 'n. 成就;完成'], ['accord', 'n./v. 一致;给予'], ['accordance', 'n. 一致;按照'],
    ['accordingly', 'adv. 因此;相应地'], ['accumulation', 'n. 积累;堆积'], ['accuracy', 'n. 准确;精确'],
    ['accustomed', 'adj. 习惯的;通常的'], ['achievement', 'n. 成就;成绩'], ['acidic', 'adj. 酸的;酸性的'],
    ['acknowledgment', 'n. 承认;感谢'], ['acoustic', 'adj. 声学的;听觉的'], ['activate', 'v. 激活;启动'],
    ['actively', 'adv. 积极地;主动地'], ['actual', 'adj. 实际的;真实的'], ['adaptation', 'n. 适应;改编'],
    ['addition', 'n. 加法;增加'], ['additive', 'n./adj. 添加剂;添加的'], ['address', 'n./v. 地址;演讲;处理'],
    ['adequately', 'adv. 充分地;足够地'], ['adjustment', 'n. 调整;调节'], ['administer', 'v. 管理;执行;给予'],
    ['administrative', 'adj. 行政的;管理的'], ['admiration', 'n. 钦佩;赞赏'], ['admittedly', 'adv. 诚然;无可否认地'],
    ['adoption', 'n. 采用;收养'], ['advance', 'n./v./adj. 前进;先进的'], ['advanced', 'adj. 先进的;高级的'],
    ['advantage', 'n. 优势;利益'], ['adverse', 'adj. 不利的;相反的'], ['adversely', 'adv. 不利地;相反地'],
    ['advocacy', 'n. 提倡;拥护'], ['affair', 'n. 事情;事务'], ['affection', 'n. 感情;喜爱'],
    ['affirm', 'v. 肯定;断言'], ['aftermath', 'n. 后果;余波'], ['agenda', 'n. 议程;日程'],
    ['aggravate', 'v. 加重;激怒'], ['aggressive', 'adj. 侵略性的;有进取心的'], ['agreeable', 'adj. 愉快的;欣然同意的'],
    ['airborne', 'adj. 空运的;空气传播的'], ['akin', 'adj. 类似的;同类的'], ['alert', 'adj./n./v. 警觉的;警报'],
    ['alien', 'n./adj. 外国人;外国的'], ['align', 'v. 使一致;对齐'], ['alignment', 'n. 对准;结盟'],
    ['allege', 'v. 宣称;断言'], ['allegedly', 'adv. 据称;据说'], ['alleviate', 'v. 减轻;缓和'],
    ['alliance', 'n. 联盟;联姻'], ['allude', 'v. 暗指;间接提到'], ['alteration', 'n. 改变;变更'],
    ['amateur', 'n./adj. 业余爱好者;业余的'], ['amazing', 'adj. 令人惊奇的'], ['ambiguity', 'n. 含糊;模棱两可'],
    ['ambitious', 'adj. 有雄心的;有野心的'], ['ample', 'adj. 充足的;丰富的'], ['amuse', 'v. 娱乐;使发笑'],
    ['analogous', 'adj. 类似的;可比拟的'], ['anatomy', 'n. 解剖学;解剖'], ['anchor', 'n./v. 锚;锚定;主持人'],
    ['anecdote', 'n. 轶事;趣闻'], ['anniversary', 'n. 周年纪念'], ['annoy', 'v. 惹恼;打扰'],
    ['anomaly', 'n. 异常;反常事物'], ['anonymous', 'adj. 匿名的;无名的'], ['antagonism', 'n. 对抗;敌对'],
    ['anticipation', 'n. 预期;期望'], ['anxious', 'adj. 焦虑的;渴望的'], ['apologize', 'v. 道歉;认错'],
    ['apparently', 'adv. 显然;似乎'], ['appeal', 'n./v. 呼吁;吸引;上诉'], ['appearance', 'n. 外貌;出现'],
    ['applicable', 'adj. 适用的;合适的'], ['applicant', 'n. 申请人;求职者'], ['appoint', 'v. 任命;指定'],
    ['apprehension', 'n. 忧虑;理解;逮捕'], ['approximate', 'adj./v. 近似的;近似'], ['apt', 'adj. 恰当的;易于…的'],
    ['archive', 'n./v. 档案;存档'], ['arduous', 'adj. 艰巨的;费力的'], ['arise', 'v. 出现;升起;由…引起'],
    ['arithmetic', 'n. 算术;计算'], ['arrangement', 'n. 安排;布置'], ['articulate', 'adj./v. 善于表达的;明确表达'],
    ['artificially', 'adv. 人工地;人为地'], ['artistic', 'adj. 艺术的;有艺术性的'], ['ascend', 'v. 上升;攀登'],
    ['ascertain', 'v. 确定;查明'], ['aspire', 'v. 渴望;追求'], ['assault', 'n./v. 攻击;袭击'],
    ['assert', 'v. 断言;维护'], ['assertion', 'n. 断言;主张'], ['assessment', 'n. 评估;估价'],
    ['assistance', 'n. 帮助;援助'], ['assistant', 'n. 助手;助理'], ['assurance', 'n. 保证;确信'],
    ['assure', 'v. 保证;确保'], ['astonish', 'v. 使惊讶'], ['astronomy', 'n. 天文学'],
    ['asymmetry', 'n. 不对称'], ['atlas', 'n. 地图集;图谱'], ['atrocity', 'n. 暴行;残暴'],
    ['attain', 'v. 达到;获得'], ['attainment', 'n. 达到;成就'], ['attitude', 'n. 态度;看法'],
    ['audible', 'adj. 听得见的'], ['augment', 'v. 增加;扩大'], ['authenticity', 'n. 真实性;可靠性'],
    ['authoritative', 'adj. 权威的;有威信的'], ['authorization', 'n. 授权;批准'], ['authorize', 'v. 授权;批准'],
    ['autonomy', 'n. 自治;自主权'], ['auxiliary', 'adj./n. 辅助的;助动词'], ['avenue', 'n. 大街;途径'],
    ['avert', 'v. 避免;转移'], ['aviation', 'n. 航空;飞行'], ['awkward', 'adj. 尴尬的;笨拙的'],
    ['axis', 'n. 轴;轴线'], ['bacterial', 'adj. 细菌的'], ['badge', 'n. 徽章;标记'],
    ['baffle', 'v. 使困惑;难住'], ['bail', 'n./v. 保释金;保释'], ['balanced', 'adj. 平衡的;均衡的'],
    ['ballot', 'n./v. 投票;选票'], ['ban', 'n./v. 禁止;禁令'], ['bandwidth', 'n. 带宽'],
    ['banking', 'n. 银行业;银行学'], ['barely', 'adv. 仅仅;几乎不'], ['baron', 'n. 男爵;大亨'],
    ['basement', 'n. 地下室;地窖'], ['bearing', 'n. 轴承;方向;举止'], ['bedrock', 'n. 基岩;基本原则'],
    ['belonging', 'n. 归属感;所有物'], ['benchmark', 'n. 基准;标杆'], ['betray', 'v. 背叛;泄露'],
    ['bibliography', 'n. 参考书目;文献目录'], ['bilateral', 'adj. 双边的;两侧的'], ['bind', 'v. 绑;约束;装订'],
    ['biochemistry', 'n. 生物化学'], ['biography', 'n. 传记'], ['blade', 'n. 刀片;叶片'],
    ['blank', 'adj./n. 空白的;空白处'], ['blast', 'n./v. 爆炸;冲击波'], ['blend', 'n./v. 混合;混合物'],
    ['blessing', 'n. 祝福;幸事'], ['blink', 'v./n. 眨眼;闪烁'], ['block', 'n./v. 块;街区;阻挡'],
    ['bloom', 'n./v. 开花;繁荣'], ['blunder', 'n./v. 大错;犯大错'], ['blunt', 'adj./v. 钝的;直率的'],
    ['blur', 'n./v. 模糊;使模糊'], ['boast', 'n./v. 自夸;吹嘘'], ['bold', 'adj. 大胆的;粗体的'],
    ['bonus', 'n. 奖金;红利'], ['booming', 'adj. 繁荣的;迅速发展的'], ['bore', 'v./n. 使厌烦;孔'],
    ['bother', 'v./n. 打扰;麻烦'], ['bounce', 'v./n. 弹跳;反弹'], ['boycott', 'n./v. 抵制;拒绝参加'],
    ['bracket', 'n./v. 括号;支架'], ['breach', 'n./v. 违反;破坏'], ['breadth', 'n. 宽度;广度'],
    ['breakdown', 'n. 故障;崩溃'], ['breed', 'n./v. 品种;繁殖'], ['brief', 'adj./n./v. 简短的;摘要'],
    ['broadband', 'n. 宽带'], ['broaden', 'v. 拓宽;扩大'], ['bruise', 'n./v. 瘀伤;擦伤'],
    ['brutal', 'adj. 残忍的;野蛮的'], ['bucket', 'n. 桶;水桶'], ['buffer', 'n./v. 缓冲;缓冲区'],
    ['bug', 'n./v. 虫子;故障'], ['bulk', 'n. 大量;大部分'], ['bullet', 'n. 子弹;项目符号'],
    ['bulletin', 'n. 公告;简报'], ['bump', 'n./v. 碰撞;肿块'], ['bunch', 'n./v. 束;群'],
    ['bundle', 'n./v. 捆;束'], ['burden', 'n./v. 负担;重负'], ['bureau', 'n. 局;办事处'],
    ['burst', 'n./v. 爆发;突发'], ['bury', 'v. 埋葬;隐藏'], ['bypass', 'n./v. 旁路;绕过'],
    ['canvas', 'n. 帆布;画布'], ['capability', 'n. 能力;才能'], ['capture', 'n./v. 捕获;捕捉'],
    ['cardinal', 'adj./n. 主要的;基数'], ['cargo', 'n. 货物;船货'], ['carpenter', 'n. 木匠'],
    ['casual', 'adj. 随便的;偶然的'], ['catalogue', 'n./v. 目录;编目'], ['catch', 'n./v. 抓住;捕获'],
    ['cater', 'v. 提供饮食;满足需要'], ['caution', 'n./v. 小心;警告'], ['cautious', 'adj. 谨慎的;小心的'],
    ['ceiling', 'n. 天花板;上限'], ['celebrated', 'adj. 著名的;闻名的'], ['censorship', 'n. 审查制度;审查'],
    ['census', 'n. 人口普查;统计'], ['ceramic', 'adj./n. 陶瓷的;陶瓷制品'], ['certainty', 'n. 确定性;确实'],
    ['certify', 'v. 证明;证实'], ['chamber', 'n. 房间;室;议院'], ['chaos', 'n. 混乱;混沌'],
    ['chaotic', 'adj. 混乱的;无秩序的'], ['characterize', 'v. 描述…的特征'], ['charter', 'n./v. 宪章;特许'],
    ['chase', 'n./v. 追逐;追捕'], ['cheat', 'n./v. 欺骗;作弊'], ['check', 'n./v. 检查;支票'],
    ['cheer', 'n./v. 欢呼;高兴'], ['cherish', 'v. 珍爱;怀抱'], ['chief', 'adj./n. 主要的;首领'],
    ['choke', 'n./v. 窒息;堵塞'], ['chunk', 'n. 大块;厚片'], ['circular', 'adj./n. 圆形的;循环的'],
    ['circulate', 'v. 循环;流通'], ['circumvent', 'v. 规避;绕过'], ['clash', 'n./v. 冲突;碰撞'],
    ['clause', 'n. 条款;从句'], ['clay', 'n. 黏土;陶土'], ['clerk', 'n. 职员;店员'],
    ['client', 'n. 客户;委托人'], ['cliff', 'n. 悬崖;峭壁'], ['climax', 'n./v. 高潮;顶点'],
    ['cling', 'v. 紧紧抓住;坚持'], ['clip', 'n./v. 夹子;剪辑'], ['clockwise', 'adv./adj. 顺时针方向'],
    ['closely', 'adv. 紧密地;仔细地'], ['closure', 'n. 关闭;结束'], ['clue', 'n. 线索;提示'],
    ['clumsy', 'adj. 笨拙的;不灵活的'], ['cluster', 'n./v. 群;簇;聚集'], ['coalition', 'n. 联盟;联合政府'],
    ['coarse', 'adj. 粗糙的;粗俗的'], ['coexist', 'v. 共存;和平共处'], ['coincidence', 'n. 巧合;一致'],
    ['collaborate', 'v. 合作;协作'], ['collaboration', 'n. 合作;协作'], ['column', 'n. 柱;列;专栏'],
    ['combat', 'n./v. 战斗;斗争'], ['combination', 'n. 结合;组合'], ['combine', 'v. 结合;联合'],
    ['combustion', 'n. 燃烧;氧化'], ['comedy', 'n. 喜剧;滑稽'], ['comic', 'adj./n. 喜剧的;喜剧演员'],
    ['command', 'n./v. 命令;指挥'], ['commemorate', 'v. 纪念;庆祝'], ['commentary', 'n. 评论;解说'],
    ['commentator', 'n. 评论员;解说员'], ['commerce', 'n. 商业;贸易'], ['commitment', 'n. 承诺;献身'],
    ['committed', 'adj. 尽心尽力的;坚定的'], ['commonplace', 'adj./n. 平凡的'], ['communicative', 'adj. 爱交际的'],
    ['companion', 'n. 同伴;伴侣'], ['comparable', 'adj. 可比较的;类似的'], ['comparative', 'adj. 比较的;相对的'],
    ['compassionate', 'adj. 富有同情心的'], ['competent', 'adj. 有能力的;胜任的'], ['competitive', 'adj. 竞争的;有竞争力的'],
    ['competitiveness', 'n. 竞争力'], ['complaint', 'n. 抱怨;投诉'], ['complement', 'n./v. 补充;补足'],
    ['complementary', 'adj. 补充的;互补的'], ['complexity', 'n. 复杂性;复杂之处'], ['compliance', 'n. 遵守;服从'],
    ['complicated', 'adj. 复杂的;难懂的'], ['compliment', 'n./v. 赞美;恭维'], ['comply', 'v. 遵守;服从'],
    ['compose', 'v. 组成;作曲'], ['composition', 'n. 组成;作文'], ['comprehend', 'v. 理解;领会'],
    ['comprehensible', 'adj. 可理解的'], ['compression', 'n. 压缩;压紧'], ['compute', 'v. 计算;估算'],
    ['conceal', 'v. 隐藏;隐瞒'], ['concede', 'v. 承认;让步'], ['conceive', 'v. 构想;怀孕'],
    ['concern', 'n./v. 关心;担忧'], ['concerning', 'prep. 关于;涉及'], ['concession', 'n. 让步;特许权'],
    ['concurrent', 'adj. 同时发生的'], ['condemn', 'v. 谴责;判刑'], ['condense', 'v. 压缩;浓缩'],
    ['conditional', 'adj. 有条件的'], ['conductivity', 'n. 导电性;传导率'], ['confer', 'v. 授予;协商'],
    ['confess', 'v. 承认;坦白'], ['confidential', 'adj. 机密的;保密的'], ['configuration', 'n. 配置;构造'],
    ['confine', 'v./n. 限制;禁闭'], ['confirmation', 'n. 确认;证实'], ['conformity', 'n. 一致;遵守'],
    ['confront', 'v. 面对;对抗'], ['confuse', 'v. 使困惑;混淆'], ['confusion', 'n. 困惑;混淆'],
    ['congestion', 'n. 拥挤;充血'], ['congratulate', 'v. 祝贺;恭喜'], ['conjunction', 'n. 连接词;结合'],
    ['connection', 'n. 连接;关系'], ['conquer', 'v. 征服;战胜'], ['conscience', 'n. 良心;良知'],
    ['conscientious', 'adj. 认真的;尽责的'], ['consecutive', 'adj. 连续的;连贯的'], ['consensus', 'n. 共识;一致意见'],
    ['consent', 'n./v. 同意;准许'], ['considerate', 'adj. 体贴的;考虑周到的'], ['consist', 'v. 由…组成;在于'],
    ['consistency', 'n. 一致性;连贯性'], ['console', 'v./n. 安慰;控制台'], ['conspicuous', 'adj. 显眼的;明显的'],
    ['conspiracy', 'n. 阴谋;密谋'], ['constant', 'adj./n. 不断的;常量'], ['constellation', 'n. 星座;星群'],
    ['constituent', 'n./adj. 成分;选民'], ['consultant', 'n. 顾问;咨询专家'], ['consultation', 'n. 咨询;磋商'],
    ['consumption', 'n. 消费;消耗'], ['contact', 'n./v. 联系;接触'], ['contain', 'v. 包含;容纳'],
    ['container', 'n. 容器;集装箱'], ['contemplation', 'n. 沉思;凝视'], ['contempt', 'n. 蔑视;轻视'],
    ['contend', 'v. 竞争;主张'], ['contender', 'n. 竞争者;争夺者'], ['content', 'n./adj./v. 内容;满意的'],
    ['contention', 'n. 争论;论点'], ['continuity', 'n. 连续性;连贯性'], ['contractor', 'n. 承包商;签约人'],
    ['contradiction', 'n. 矛盾;反驳'], ['contrary', 'adj./n./adv. 相反的'], ['contributor', 'n. 贡献者;捐款人'],
    ['controversy', 'n. 争议;争论'], ['convenience', 'n. 方便;便利'], ['convenient', 'adj. 方便的;便利的'],
    ['conversely', 'adv. 相反地;反之'], ['conversion', 'n. 转变;转换'], ['convertible', 'adj./n. 可转换的'],
    ['convey', 'v. 传达;运送'], ['convict', 'n./v. 囚犯;定罪'], ['conviction', 'n. 定罪;信念'],
    ['cooperative', 'adj./n. 合作的;合作社'], ['copper', 'n. 铜;铜币'], ['copyright', 'n. 版权;著作权'],
    ['cord', 'n. 绳索;电线'], ['corps', 'n. 军团;兵团'], ['corpse', 'n. 尸体'],
    ['correction', 'n. 改正;修正'], ['correlation', 'n. 相关;关联'], ['correspondence', 'n. 通信;信件'],
    ['correspondent', 'n. 记者;通讯员'], ['corridor', 'n. 走廊;通道'], ['corrode', 'v. 腐蚀;侵蚀'],
    ['corrosion', 'n. 腐蚀;侵蚀'], ['cosmetic', 'adj./n. 美容的;化妆品'], ['cosmic', 'adj. 宇宙的;极大的'],
    ['costume', 'n. 服装;戏服'], ['council', 'n. 委员会;议会'], ['counseling', 'n. 咨询;辅导'],
    ['counter', 'n./v./adv. 柜台;反驳'], ['counteract', 'v. 抵消;中和'], ['counterfeit', 'adj./n./v. 伪造的'],
    ['countless', 'adj. 无数的;数不尽的'], ['coup', 'n. 政变;突然行动'], ['courtesy', 'n. 礼貌;好意'],
    ['coverage', 'n. 覆盖范围;新闻报道'], ['coward', 'n. 懦夫;胆小鬼'], ['craft', 'n./v. 工艺;手艺'],
    ['crawl', 'v./n. 爬行;缓慢行进'], ['credential', 'n. 证书;资格'], ['credible', 'adj. 可信的;可靠的'],
    ['credibility', 'n. 可信度;可靠性'], ['crescent', 'n./adj. 新月;新月形的'], ['crest', 'n. 山顶;冠'],
    ['crew', 'n. 全体人员;工作人员'], ['cricket', 'n. 板球;蟋蟀'], ['criterion', 'n. 标准;准则'],
    ['critically', 'adv. 批判地;严重地'], ['criticise', 'v. 批评;评论'], ['critique', 'n./v. 批评;评论'],
    ['crown', 'n./v. 王冠;加冕'], ['crude', 'adj./n. 粗糙的;原油'], ['cruise', 'n./v. 巡游;巡航'],
    ['crush', 'n./v. 压碎;粉碎'], ['crystal', 'n./adj. 水晶;晶体'], ['cult', 'n. 邪教;狂热崇拜'],
    ['cumulative', 'adj. 累积的;渐增的'], ['cunning', 'adj./n. 狡猾的;灵巧'], ['curator', 'n. 馆长;策展人'],
    ['curl', 'n./v. 卷曲;蜷缩'], ['curvature', 'n. 弯曲;曲率'], ['cushion', 'n./v. 垫子;缓冲'],
    ['custody', 'n. 监护;保管'], ['customize', 'v. 定制;定做'], ['cyber', 'adj. 网络的'],
    ['cylinder', 'n. 圆柱;圆筒'], ['dam', 'n./v. 水坝;堤坝'], ['damp', 'adj./n./v. 潮湿的;湿气'],
    ['dash', 'n./v. 猛冲;破折号'], ['dawn', 'n./v. 黎明;破晓'], ['dazzle', 'n./v. 耀眼;使目眩'],
    ['deadline', 'n. 截止日期'], ['deadly', 'adj./adv. 致命的'], ['dealer', 'n. 经销商;交易商'],
    ['debris', 'n. 碎片;残骸'], ['debut', 'n./v. 首次亮相'], ['decay', 'n./v. 腐烂;衰退'],
    ['deceased', 'adj./n. 已故的;死者'], ['decent', 'adj. 体面的;正派的'], ['decimal', 'adj./n. 小数的;小数'],
    ['deck', 'n. 甲板;一副牌'], ['declaration', 'n. 宣布;声明'], ['dedicate', 'v. 奉献;致力于'],
    ['deduction', 'n. 扣除;推论'], ['deed', 'n. 行为;契约'], ['deem', 'v. 认为;相信'],
    ['default', 'n./v. 违约;默认'], ['defect', 'n./v. 缺陷;叛逃'], ['defensive', 'adj./n. 防御的'],
    ['defiance', 'n. 蔑视;违抗'], ['degrade', 'v. 降级;退化'], ['deform', 'v. 使变形;使畸形'],
    ['delegate', 'n./v. 代表;委派'], ['delegation', 'n. 代表团;委派'], ['deliberately', 'adv. 故意地'],
    ['delicate', 'adj. 精致的;微妙的'], ['delta', 'n. 三角洲'], ['demolish', 'v. 拆除;破坏'],
    ['demonstrator', 'n. 示威者'], ['denial', 'n. 否认;拒绝'], ['denote', 'v. 表示;意味着'],
    ['denounce', 'v. 谴责;告发'], ['density', 'n. 密度;稠密'], ['depict', 'v. 描绘;描述'],
    ['deploy', 'v. 部署;展开'], ['deport', 'v. 驱逐出境'], ['depot', 'n. 仓库;车站'],
    ['deprive', 'v. 剥夺;使丧失'], ['deputy', 'n. 副职;代理人'], ['descend', 'v. 下降;下来'],
    ['descent', 'n. 下降;血统'], ['designate', 'v. 指定;任命'], ['desirable', 'adj. 理想的;可取的'],
    ['despise', 'v. 鄙视;蔑视'], ['destiny', 'n. 命运;天命'], ['destruction', 'n. 破坏;毁灭'],
    ['destructive', 'adj. 破坏性的'], ['detachment', 'n. 超然;分遣队'], ['detective', 'n. 侦探'],
    ['deter', 'v. 阻止;威慑'], ['detergent', 'n./adj. 洗涤剂'], ['detrimental', 'adj. 有害的'],
    ['devastate', 'v. 摧毁;毁灭'], ['deviation', 'n. 偏差;偏离'], ['diagnose', 'v. 诊断;判断'],
    ['diagram', 'n./v. 图表;图解'], ['diameter', 'n. 直径'], ['dictate', 'v./n. 口述;命令'],
    ['differentiation', 'n. 区别;分化'], ['diffuse', 'v./adj. 扩散;弥漫的'], ['dignity', 'n. 尊严;高贵'],
    ['dilute', 'v./adj. 稀释;冲淡'], ['dim', 'adj./v. 暗淡的;模糊'], ['dine', 'v. 进餐;用餐'],
    ['diplomat', 'n. 外交官'], ['diplomatic', 'adj. 外交的'], ['directory', 'n. 目录;指南'],
    ['disable', 'v. 使丧失能力'], ['disadvantage', 'n. 劣势;不利条件'], ['disagree', 'v. 不同意'],
    ['disappointment', 'n. 失望;沮丧'], ['disastrous', 'adj. 灾难性的'], ['discard', 'v./n. 丢弃;抛弃'],
    ['discern', 'v. 识别;看出'], ['discharge', 'n./v. 排放;解雇'], ['disclose', 'v. 披露;揭露'],
    ['discomfort', 'n. 不适;不安'], ['discontent', 'n./adj. 不满'], ['discord', 'n. 不和;分歧'],
    ['discourage', 'v. 使气馁;阻止'], ['discrepancy', 'n. 差异;不符'], ['discretion', 'n. 谨慎;自由裁量权'],
    ['discrimination', 'n. 歧视;辨别'], ['disgrace', 'n./v. 耻辱'], ['disguise', 'n./v. 伪装;掩饰'],
    ['disillusion', 'v./n. 使醒悟'], ['dismantle', 'v. 拆除;拆开'], ['dismiss', 'v. 解雇;驳回'],
    ['dismissal', 'n. 解雇;驳回'], ['dispatch', 'n./v. 派遣;发送'], ['dispense', 'v. 分配;发放'],
    ['disperse', 'v. 分散;驱散'], ['displacement', 'n. 取代;位移'], ['disposable', 'adj. 一次性的'],
    ['disposal', 'n. 处理;处置'], ['disproportionate', 'adj. 不成比例的'], ['dispute', 'n./v. 争论;争端'],
    ['disregard', 'n./v. 忽视;漠视'], ['disrupt', 'v. 扰乱;使中断'], ['disruption', 'n. 扰乱;中断'],
    ['dissatisfaction', 'n. 不满'], ['dissipate', 'v. 消散;浪费'], ['dissolve', 'v. 溶解;解散'],
    ['distant', 'adj. 遥远的;疏远的'], ['distinction', 'n. 区别;差别'], ['distinctive', 'adj. 独特的'],
    ['distinguish', 'v. 区分;辨别'], ['distract', 'v. 使分心'], ['distribute', 'v. 分配;分发'],
    ['distribution', 'n. 分配;分布'], ['district', 'n. 地区;区域'], ['disturb', 'v. 打扰;扰乱'],
    ['disturbance', 'n. 干扰;骚乱'], ['diversion', 'n. 转移;消遣'], ['divert', 'v. 转移;使转向'],
    ['divine', 'adj./v. 神圣的;推测'], ['divorce', 'n./v. 离婚;分离'], ['documentary', 'adj./n. 纪录的;纪录片'],
    ['domain', 'n. 领域;范围'], ['dome', 'n. 圆屋顶;穹顶'], ['dominance', 'n. 优势;统治'],
    ['donate', 'v. 捐赠;捐献'], ['donation', 'n. 捐赠;捐款'], ['doom', 'n./v. 厄运;注定'],
    ['dose', 'n./v. 剂量;服药'], ['downward', 'adj./adv. 向下的'], ['drag', 'n./v. 拖;拉'],
    ['drain', 'n./v. 排水;耗尽'], ['drainage', 'n. 排水;排水系统'], ['drastic', 'adj. 激烈的;严厉的'],
    ['drawback', 'n. 缺点;不利条件'], ['drift', 'n./v. 漂流;漂移'], ['drip', 'n./v. 滴;滴水'],
    ['dual', 'adj. 双的;双重的'], ['dubious', 'adj. 可疑的;不确定的'], ['duplicate', 'n./v./adj. 副本;复制'],
    ['durable', 'adj. 耐用的;持久的'], ['dwell', 'v. 居住;栖息'], ['dweller', 'n. 居民;居住者'],
    ['dwelling', 'n. 住所;寓所'], ['dye', 'n./v. 染料;染色'], ['earnest', 'adj./n. 认真的;定金'],
    ['ease', 'n./v. 容易;减轻'], ['echo', 'n./v. 回声;共鸣'], ['eclipse', 'n./v. 日食;月食'],
    ['ecstasy', 'n. 狂喜;入迷'], ['edible', 'adj. 可食用的'], ['editorial', 'adj./n. 编辑的;社论'],
    ['educator', 'n. 教育工作者'], ['effectiveness', 'n. 有效性'], ['efficacy', 'n. 功效;效力'],
    ['efficiency', 'n. 效率;效能'], ['efficiently', 'adv. 有效地'], ['ego', 'n. 自我;自负'],
    ['elaborate', 'adj./v. 精心制作的'], ['elastic', 'adj./n. 有弹性的'], ['elderly', 'adj./n. 上了年纪的;老年人'],
    ['elect', 'v./adj. 选举;当选的'], ['electorate', 'n. 选民;选举人团'], ['elegant', 'adj. 优雅的;高雅的'],
    ['element', 'n. 元素;要素'], ['elemental', 'adj. 基本的;元素的'], ['elevate', 'v. 提升;举起'],
    ['eligible', 'adj. 有资格的;合格的'], ['elimination', 'n. 消除;淘汰'], ['elite', 'n./adj. 精英;精英的'],
    ['eloquent', 'adj. 雄辩的'], ['embark', 'v. 上船;开始'], ['embarrass', 'v. 使尴尬;使难堪'],
    ['embassy', 'n. 大使馆'], ['embody', 'v. 体现;使具体化'], ['embrace', 'n./v. 拥抱;接受'],
    ['emerge', 'v. 出现;浮现'], ['emergence', 'n. 出现;浮现'], ['emergency', 'n. 紧急情况'],
    ['eminent', 'adj. 杰出的;著名的'], ['emit', 'v. 发出;排放'], ['emotion', 'n. 情感;情绪'],
    ['emotional', 'adj. 情感的;情绪的'], ['enact', 'v. 制定法律;扮演'], ['enclose', 'v. 围住;附上'],
    ['encompass', 'v. 包含;包括'], ['encouragement', 'n. 鼓励;激励'], ['endeavour', 'n./v. 努力;尽力'],
    ['endless', 'adj. 无止境的'], ['endorse', 'v. 赞同;支持'], ['endure', 'v. 忍受;持久'],
    ['energetic', 'adj. 精力充沛的'], ['engagement', 'n. 参与;订婚'], ['engrave', 'v. 雕刻;铭记'],
    ['engross', 'v. 使全神贯注'], ['enlarge', 'v. 扩大;放大'], ['enlighten', 'v. 启发;开导'],
    ['enormous', 'adj. 巨大的;庞大的'], ['enrich', 'v. 使丰富;使富裕'], ['enrol', 'v. 注册;入学'],
    ['ensue', 'v. 接着发生'], ['ensure', 'v. 确保;保证'], ['entail', 'v. 需要;牵涉'],
    ['entertain', 'v. 娱乐;招待'], ['entertainment', 'n. 娱乐;消遣'], ['enthusiastic', 'adj. 热情的'],
    ['entire', 'adj. 整个的;全部的'], ['entitle', 'v. 给予权利;命名'], ['envelope', 'n. 信封;封套'],
    ['envisage', 'v. 设想;想象'], ['episode', 'n. 插曲;一集'], ['epoch', 'n. 时代;纪元'],
    ['equator', 'n. 赤道'], ['equilibrium', 'n. 平衡;均衡'], ['eradicate', 'v. 根除;消灭'],
    ['erratic', 'adj. 不稳定的;古怪的'], ['erroneous', 'adj. 错误的'], ['erupt', 'v. 爆发;喷发'],
    ['escalate', 'v. 升级;扩大'], ['escort', 'n./v. 护送;陪同'], ['essence', 'n. 本质;精髓'],
    ['essential', 'adj./n. 必不可少的;要素'], ['establishment', 'n. 建立;机构'], ['eternal', 'adj. 永恒的;永远的'],
    ['ethnic', 'adj. 民族的;种族的'], ['evacuate', 'v. 撤离;疏散'], ['evade', 'v. 逃避;规避'],
    ['evaluate', 'v. 评估;评价'], ['evenly', 'adv. 均匀地;平坦地'], ['evident', 'adj. 明显的;明白的'],
    ['evoke', 'v. 唤起;引起'], ['evolution', 'n. 进化;演变'], ['evolutionary', 'adj. 进化的'],
    ['exaggerate', 'v. 夸大;夸张'], ['excel', 'v. 擅长;胜过'], ['exception', 'n. 例外;除外'],
    ['exceptional', 'adj. 例外的;杰出的'], ['excess', 'n./adj. 过量;额外的'], ['excessive', 'adj. 过多的;过分的'],
    ['excitement', 'n. 兴奋;刺激'], ['exclamation', 'n. 感叹;惊呼'], ['exclusion', 'n. 排除;排斥'],
    ['exclusive', 'adj./n. 独有的;独家新闻'], ['execution', 'n. 执行;实施'], ['exemplify', 'v. 举例说明'],
    ['exempt', 'adj./v. 被免除的;豁免'], ['exert', 'v. 施加;运用'], ['exhaust', 'n./v. 耗尽;使筋疲力尽'],
    ['exhaustion', 'n. 精疲力竭'], ['exit', 'n./v. 出口;离开'], ['exotic', 'adj. 异国的;外来的'],
    ['expansion', 'n. 扩张;扩展'], ['expedition', 'n. 远征;探险'], ['expend', 'v. 花费;消耗'],
    ['expert', 'n./adj. 专家;熟练的'], ['expiration', 'n. 期满;截止'], ['expire', 'v. 到期;届满'],
    ['explicitly', 'adv. 明确地;清楚地'], ['explode', 'v. 爆炸;爆发'], ['exploration', 'n. 探索;勘探'],
    ['explore', 'v. 探索;探讨'], ['explorer', 'n. 探险家;探索者'], ['explosion', 'n. 爆炸;爆发'],
    ['explosive', 'adj./n. 爆炸的;爆炸物'], ['extension', 'n. 延伸;扩展'], ['extensive', 'adj. 广泛的;大量的'],
    ['exterior', 'n./adj. 外部;外观'], ['extinct', 'adj. 灭绝的;熄灭的'], ['extinguish', 'v. 熄灭;扑灭'],
    ['extraction', 'n. 提取;开采'], ['extraordinary', 'adj. 非凡的;特别的'], ['extravagant', 'adj. 奢侈的;浪费的'],
    ['extreme', 'adj./n. 极端的;极度'], ['fabric', 'n. 织物;布料'], ['fabricate', 'v. 制造;捏造'],
    ['fabulous', 'adj. 极好的;难以置信的'], ['facade', 'n. 正面;外表'], ['facial', 'adj./n. 面部的;面部护理'],
    ['facilitator', 'n. 促进者;协调人'], ['facility', 'n. 设施;设备'], ['factual', 'adj. 事实的;真实的'],
    ['fade', 'v./n. 褪色;逐渐消失'], ['fairly', 'adv. 相当;公平地'], ['faith', 'n. 信仰;信念'],
    ['faithful', 'adj. 忠诚的;忠实的'], ['fake', 'adj./n./v. 假的;伪造'], ['fame', 'n. 名声;声誉'],
    ['famed', 'adj. 著名的;闻名的'], ['fanatic', 'n./adj. 狂热者;狂热的'], ['fantastic', 'adj. 极好的;奇异的'],
    ['fantasy', 'n./v. 幻想;白日梦'], ['far-reaching', 'adj. 影响深远的'], ['fascinate', 'v. 使着迷'],
    ['fatal', 'adj. 致命的;毁灭性的'], ['fate', 'n. 命运;天意'], ['fatigue', 'n./v. 疲劳;疲乏'],
    ['fault', 'n./v. 过错;故障'], ['favour', 'n./v. 赞成;偏爱'], ['favourable', 'adj. 有利的;赞成的'],
    ['feasible', 'adj. 可行的;可能的'], ['feast', 'n./v. 盛宴;宴会'], ['feat', 'n. 功绩;壮举'],
    ['federation', 'n. 联邦;联盟'], ['feminine', 'adj./n. 女性的;阴性'], ['feminist', 'n./adj. 女权主义者'],
    ['fertility', 'n. 肥沃;生育能力'], ['feverish', 'adj. 发烧的;狂热的'], ['fibre', 'n. 纤维;光纤'],
    ['figurative', 'adj. 比喻的;象征的'], ['filter', 'n./v. 过滤器;过滤'], ['filth', 'n. 污物;污秽'],
    ['finalise', 'v. 最终确定;定稿'], ['financing', 'n. 融资;筹资'], ['firearm', 'n. 火器;枪支'],
    ['fitting', 'adj./n. 合适的;配件'], ['fixture', 'n. 固定装置;体育比赛'], ['flap', 'n./v. 拍打;飘动'],
    ['flare', 'n./v. 闪光;闪耀'], ['flaw', 'n./v. 缺陷;瑕疵'], ['flawless', 'adj. 完美的;无瑕的'],
    ['flee', 'v. 逃离;逃避'], ['fleet', 'n./adj. 舰队;快速的'], ['flexibility', 'n. 灵活性;柔韧性'],
    ['flick', 'n./v. 轻弹;轻拍'], ['flicker', 'n./v. 闪烁;摇曳'], ['fling', 'n./v. 扔;抛'],
    ['flock', 'n./v. 群;聚集'], ['foam', 'n./v. 泡沫;起泡沫'], ['foe', 'n. 敌人;反对者'],
    ['foggy', 'adj. 有雾的;模糊的'], ['foil', 'n./v. 箔;衬托;挫败'], ['fold', 'n./v. 折叠;褶痕'],
    ['footage', 'n. 影片片段'], ['forbid', 'v. 禁止;不许'], ['foremost', 'adj./adv. 最重要的;首先'],
    ['forensic', 'adj. 法医的;法庭的'], ['forerunner', 'n. 先驱;先行者'], ['foresee', 'v. 预见;预知'],
    ['foreseeable', 'adj. 可预见的'], ['forge', 'n./v. 锻造;伪造'], ['formidable', 'adj. 可怕的;难以对付的'],
    ['fort', 'n. 堡垒;要塞'], ['forthcoming', 'adj./n. 即将发生的'], ['fortunate', 'adj. 幸运的;侥幸的'],
    ['forum', 'n. 论坛;讨论会'], ['found', 'v. 建立;创立'], ['founder', 'n./v. 创始人;沉没'],
    ['founding', 'adj./n. 创立的'], ['fragrance', 'n. 香味;芳香'],
  ];

  /* 雅思词汇分类标签映射
   * R = 阅读高频词, L = 听力场景词, W = 写作核心词, A = 学术通用词
   * 多标签用空格分隔，如 'R W' 表示同时属于阅读和写作
   */
  var IELTS_TAG_MAP = (function () {
    var R = {}, L = {}, W = {}, A = {};
    // R: 阅读高频词
    'abstract abundant accelerate access adapt alter ancient annual anticipate apparent appendix archaeology architecture assemble assume astonishing attribute authority available aware barrier bias boundary capacity category cease challenge characteristic chronological circumstance cite civilisation climate coherent coincide collapse colleague commence commission commodity community compatible comprehensive comprise concentrate concept concise conclude conflict conform consequence considerable consistent constitute constrain construct consume contaminate contemporary context contradict contrast controversial conventional convert convince cooperate crucial decline deduce deficiency demonstrate dense derive detect deteriorate device dimension diminish discrete discriminate displace display dispose distinct distort diverse dominant duration dynamic eliminate empirical enable encounter engage entity equivalent erode establish estimate evolve exceed exclude exploit external extract facilitate finite fluctuate focus foundation framework function generate genetic geographical hierarchy highlight hypothesis identical illustrate immense impact implement implication incentive incidence inevitable infrastructure inherent initial initiate input instinct institution instruction intelligent internal justify legislation levy likewise link locate magnitude margin maximize mechanism mediate migration minimum modify monitor mutual network neutral nevertheless notion objective occupy occur offset ongoing option output overall overlap panel paradigm parameter participate perceive period persist perspective phase phenomenon policy portion pose potential precede precise predict preserve presume previous primary prime principle priority proceed process prohibit promote proportion prospect protocol pursue qualitative quantitative radical range ratio rational react recover refine regime region reinforce reject relevant reluctant rely on remove require research reside resolve resource respond restore restrict retain reveal reverse revise rigid role scenario schedule scheme scope sector seek sequence shift significant simulate sole somewhat source specific specify stable statistic status strategy structure subsequent substitute sufficient sum summary survey sustain symbol technical technique temporary theory thereby topic trace traditional transfer transform transmit trend trigger ultimate undergo underlie undertake uniform unique valid vary version via virtual visible volume welfare whereas widespread yield'.split(' ').forEach(function (w) { R[w] = true; });
    // L: 听力场景词
    'accommodation adolescent agriculture allocate alternative ambiguous amend analyse annual anticipate apparent appreciate arbitrary array assess assist assume astonish authority available aware barrier behaviour bias boost boundary capacity category challenge characteristic cite clarify classify climate coherent coincide collapse colleague commence commission communicate community compatible compensate complex component comprehensive comprise concentrate concept conclude conduct confirm conflict conform consequence considerable consistent constitute constrain construct consume contemporary context contrast contribute controversial conventional convert convince cooperate coordinate core crucial cultivate decline define demonstrate dense derive detect device devote differentiate dimension diminish discrete display dispose distinct diverse dominant draft duration dynamic eliminate enable encounter engage enforce entity equivalent erode establish estimate evaluate evolve exceed exclude exploit external extract facilitate finite fluctuate focus foundation framework function generate geographical highlight hypothesis identical illustrate immense impact implement implication incentive inevitable infrastructure inherent initial initiate input instruction intelligent internal justify labour force legislation levy likewise link locate magnitude manual margin maximize mechanism mediate migration minimum modify monitor mutual network neutral nevertheless notion objective occupy occur offset ongoing option output overall overlap panel parameter participate perceive period persist perspective phase phenomenon policy portion pose potential precise predict preserve presume previous primary prime principle priority proceed process prohibit promote proportion prospect protocol psychological pursue qualitative quantitative radical range ratio rational react recover refine region reinforce reject relevant reluctant rely on remove require research reside resolve resource respond restore restrict retain reveal reverse revise rigid role scenario schedule scheme scope sector seek sequence shift significant simulate sole somewhat source specific specify stable statistic status strategy structure subsequent substitute sufficient sum summary survey sustain symbol technical technique temporary theory thereby topic trace traditional transfer transform transmit trend trigger ultimate undergo underlie undertake uniform unique valid vary version via virtual visible volume welfare whereas widespread yield'.split(' ').forEach(function (w) { L[w] = true; });
    // W: 写作核心词
    'abandon abolish abstract abundant academy accommodate accompany accomplish account for accurate accumulate acknowledge acquire adequate adjust administration advocate affect affluent allocate alternative ambiguous amend analyse annual anticipate apparent appreciate appropriate arbitrary archaeology architecture array assess assign assist assume astonishing attribute authority automate available aware barrier behaviour bias biodiversity biological boost boundary capacity category cease challenge characteristic chronological circumstance cite civilisation clarify classify climate coherent coincide collapse commence commission commodity communicate community compatible compensate compile complex component comprehensive comprise concentrate concept concise conclude conduct confirm conflict conform consequence considerable consistent constitute constrain construct consume contaminate contemporary context contradict contrast contribute controversial conventional convert convince cooperate coordinate core crucial cultivate decline deduce deficiency define demonstrate dense derive detect deteriorate device devote differentiate dimension diminish discrete discriminate displace display dispose distinct distort diverse dominant draft duration dynamic eliminate empirical enable encounter engage enforce entity equivalent erode establish estimate evaluate evolve exceed exclude exploit external extract facilitate finite fluctuate focus foundation framework function generate genetic geographical hierarchy highlight hypothesis identical illustrate immense impact implement implication incentive incidence inevitable infrastructure inherent initial initiate input instinct institution instruction intelligent internal justify labour force legislation levy likewise link locate magnitude manual margin maximize mechanism mediate migration minimum modify monitor mutual network neutral nevertheless notion objective occupy occur offset ongoing option output overall overlap panel paradigm parameter participate perceive period persist perspective phase phenomenon policy portion pose potential precede precise predict preserve presume previous primary prime principle priority proceed process prohibit promote proportion prospect protocol psychological pursue qualitative quantitative radical range ratio rational react recover refine regime region reinforce reject relevant reluctant rely on remove require research reside resolve resource respond restore restrict retain reveal reverse revise rigid role scenario schedule scheme scope sector seek sequence shift significant simulate sole somewhat source specific specify stable statistic status strategy structure subsequent substitute sufficient sum summary survey sustain symbol technical technique temporary theory thereby topic trace traditional transfer transform transmit trend trigger ultimate undergo underlie undertake uniform unique valid vary version via virtual visible volume welfare whereas widespread yield'.split(' ').forEach(function (w) { W[w] = true; });
    // 构建映射: key = 小写词, value = tag 字符串
    var map = {};
    function addTag(word, tag) {
      if (!map[word]) map[word] = tag;
      else if (map[word].indexOf(tag) < 0) map[word] += ' ' + tag;
    }
    // 先收集所有出现过的词
    var allWords = {};
    IELTS_VOCAB.concat(IELTS_EXTRA_VOCAB).forEach(function (pair) {
      allWords[pair[0].toLowerCase()] = true;
    });
    Object.keys(allWords).forEach(function (w) {
      var tagged = false;
      if (R[w]) { addTag(w, 'R'); tagged = true; }
      if (L[w]) { addTag(w, 'L'); tagged = true; }
      if (W[w]) { addTag(w, 'W'); tagged = true; }
      if (!tagged) addTag(w, 'A');
    });
    return map;
  })();

  (function mergeIeltsVocab() {
    var seen = {};
    IELTS_VOCAB = IELTS_VOCAB.concat(IELTS_EXTRA_VOCAB).filter(function (pair) {
      var key = pair[0].toLowerCase();
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    }).sort(function (a, b) { return a[0].localeCompare(b[0]); });
    // 给每个词打标签: [word, meaning] → [word, meaning, tag]
    IELTS_VOCAB.forEach(function (pair) {
      var tag = IELTS_TAG_MAP[pair[0].toLowerCase()] || 'A';
      pair.push(tag);
    });
  })();

  /* ---------- 极简学习算法 ---------- *
   * 设计目标:不再让用户记复杂评分,只做三件事:
   *   q=1 不认识 → 立即在本次队列尾部再加一次
   *   q=2 跳过   → 卡片维持原 due,下次还在
   *   q=3 认识   → due = 明天(把"复习"留到明天)
   * 这样用户每次学习的"工作量"完全由自己决定:
   * 想学 5 个就 5 个,想学 50 个就 50 个。
   */
  function applyRate(card, q) {
    normalizeCard(card);
    card.lastReview = now();  // 所有评分都记录复习时间
    if (q === 1) {
      // 不认识:立刻加到本组末尾再来一次
      card.rep = 0;
      card.interval = 0;
      card.ef = Math.max(1.3, (card.ef || 2.5) - 0.2);
      card.due = now();
      card.skip = false;
    } else if (q === 2) {
      // 跳过:保持当前 due,下次自动出现
      card.skip = true;
      card.due = now();
    } else {
      // 认识:按间隔调度
      card.rep = (card.rep || 0) + 1;
      card.ef = Math.min(3.2, (card.ef || 2.5) + 0.08);
      card.interval = card.rep === 1 ? 1 : Math.max(1, Math.round((card.interval || 1) * card.ef));
      card.due = addDays(now(), card.interval);
      card.skip = false;
    }
  }

  /* ---------- Rendering ---------- */
  var decksList = document.getElementById('decksList');
  var flashcard = document.getElementById('flashcard');
  var flashcardWrap = document.getElementById('flashcardWrap');
  var cardFront = document.getElementById('cardFront');
  var cardBack = document.getElementById('cardBack');
  var cardDeckName = document.getElementById('cardDeckName');
  var progressFill = document.getElementById('studyProgressFill');
  var progressLabel = document.getElementById('studyProgressLabel');
  var goalRing = document.getElementById('goalRing');
  var goalDone = document.getElementById('goalDone');
  var goalTarget = document.getElementById('goalTarget');
  var ratingRow = document.querySelector('.rating-row');

  function setRatingReady(ready) {
    if (!ratingRow) return;
    ratingRow.classList.toggle('locked', !ready);
    Array.prototype.forEach.call(ratingRow.querySelectorAll('.rate-btn'), function (btn) {
      btn.setAttribute('aria-disabled', ready ? 'false' : 'true');
    });
  }

  function renderDecks() {
    decksList.innerHTML = '';
    if (!state.decks.length) {
      decksList.innerHTML = '<div style="text-align:center;color:var(--muted);padding:20px 0;font-size:13px;">还没有卡组,去下方"雅思词库"一键导入 ✨</div>';
      return;
    }
    state.decks.forEach(function (d) {
      var el = document.createElement('div');
      el.className = 'deck-item' + (d.id === activeDeckId ? ' active' : '');
      el.innerHTML = '<span class="name">' + esc(d.name) + '</span><span class="count">' + d.cards.length + ' 张</span>';
      el.addEventListener('click', function () {
        activeDeckId = d.id;
        buildQueue();
        renderDecks();
        showNext();
      });
      decksList.appendChild(el);
    });
    // 添加新卡组按钮
    var addBtn = document.createElement('div');
      addBtn.className = 'deck-item';
      addBtn.style.justifyContent = 'center';
      addBtn.style.color = 'var(--muted)';
      addBtn.style.cursor = 'pointer';
      addBtn.innerHTML = '<span class="name" style="font-weight:500;">+ 新建卡组</span>';
      addBtn.addEventListener('click', async function () {
        var r = await RBModal.input({ title: '新建卡组', fields: [{ key: 'name', label: '卡组名称', type: 'text', placeholder: '如:四六级词汇' }] });
        var name = r && r.name && r.name.trim();
        if (!name) return;
        var id = 'd' + Date.now();
        state.decks.push({ id: id, name: name, cards: [] });
        saveState(); renderDecks(); refreshDeckSelect(); renderIelts(); renderGrade(); renderMiddle();
      });
    decksList.appendChild(addBtn);
  }

  /* 构建本次学习的队列
   * 排序优先级:
   *   1) 之前说不认识、要求"末尾再来"的卡(due 已置为 now+60s)
   *   2) 昨天 / 更早到期但昨天没复习的卡
   *   3) 真正今天到期的卡
   *   4) 还没学过的卡(因 "想学多少学多少",允许用户主动 import 后立即出现)
   */
  function buildQueue() {
    var deck = state.decks.find(function (d) { return d.id === activeDeckId; });
    if (!deck) { studyQueue = []; return; }
    var t = now();

    // 判断昨天是否使用过（从自身 dailyLog 读取）
    var yesterdayUsed = false;
    try {
      var y = new Date(); y.setDate(y.getDate() - 1);
      var yKey = todayKey(); // 今天
      var ydKey = y.toISOString().slice(0, 10); // 昨天
      yesterdayUsed = !!(state.dailyLog && state.dailyLog[ydKey]);
    } catch (e) {}

    studyQueue = deck.cards.filter(function (c) {
      // 已经认识且 due > 今天末尾 → 跳过(明天再出现)
      var dayEnd = new Date(); dayEnd.setHours(23, 59, 59, 999);
      if (c.lastReview && c.due > dayEnd.getTime() && !c.skip) return false;
      return c.due <= t || c.lastReview == null;   // 还没学过也排上
    });

    // 如果昨天用过，把昨天复习过且今天到期的卡片标记为"昨日复习"优先显示
    if (yesterdayUsed) {
      var yesterdayStart = new Date(); yesterdayStart.setDate(yesterdayStart.getDate() - 1); yesterdayStart.setHours(0, 0, 0, 0);
      var yesterdayEnd = new Date(); yesterdayEnd.setDate(yesterdayEnd.getDate() - 1); yesterdayEnd.setHours(23, 59, 59, 999);
      studyQueue.sort(function (a, b) {
        var aYesterday = a.lastReview && a.lastReview >= yesterdayStart.getTime() && a.lastReview <= yesterdayEnd.getTime();
        var bYesterday = b.lastReview && b.lastReview >= yesterdayStart.getTime() && b.lastReview <= yesterdayEnd.getTime();
        // 昨天复习过的优先
        if (aYesterday !== bYesterday) return aYesterday ? -1 : 1;
        // 不认识再来 > 越早到期 > 越早加入
        var aIsReview = a.due <= t && a.lastReview;
        var bIsReview = b.due <= t && b.lastReview;
        if (aIsReview !== bIsReview) return aIsReview ? -1 : 1;
        if (a.due !== b.due) return a.due - b.due;
        return (a.added || 0) - (b.added || 0);
      });
    } else {
      studyQueue.sort(function (a, b) {
        var aIsReview = a.due <= t && a.lastReview;
        var bIsReview = b.due <= t && b.lastReview;
        if (aIsReview !== bIsReview) return aIsReview ? -1 : 1;
        if (a.due !== b.due) return a.due - b.due;
        return (a.added || 0) - (b.added || 0);
      });
    }
    totalForSession = studyQueue.length;
    doneThisSession = 0;
    updateProgress();
  }

  function showNext() {
    isFlipped = false;
    flashcard.classList.remove('flipped');
    flashcardWrap.classList.remove('shake', 'glow');
    setRatingReady(false);
    if (!studyQueue.length) { buildQueue(); }
    var deck = state.decks.find(function (d) { return d.id === activeDeckId; });
    if (!studyQueue.length || !deck) {
      currentCard = null;
      // 空状态隐藏评分按钮
      if (ratingRow) ratingRow.style.display = 'none';
      // 智能空状态:有卡组但空 → 引导导入;无卡组 → 引导建卡组
      if (deck && deck.cards.length === 0) {
        var fc = document.querySelector('.flashcard');
        if (fc) { fc.style.height = 'auto'; fc.style.minHeight = '220px'; }
        cardFront.innerHTML = '<div style="text-align:center;line-height:1.6;">' +
          '<div style="font-size:42px;margin-bottom:6px;">📭</div>' +
          '<div style="font-size:16px;font-weight:600;color:var(--ink);">「' + esc(deck.name) + '」还是空的</div>' +
          '<div style="font-size:12px;color:var(--muted);margin:4px 0 10px;">下滑到「雅思词库」或「小学词库」一键加词吧</div>' +
          '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">' +
          '<button id="emptyGoIelts" class="btn btn-primary" style="margin:0;padding:8px 12px;font-size:12px;border-radius:10px;">📚 雅思词库</button>' +
          '<button id="emptyGoGrade" class="btn btn-ghost" style="margin:0;padding:8px 12px;font-size:12px;border-radius:10px;">🎒 小学词库</button>' +
          '</div></div>';
        cardBack.textContent = '先选词,加进来就开始背';
        cardDeckName.textContent = deck.name;
        progressLabel.textContent = doneThisSession + ' / ' + totalForSession;
        // 绑按钮事件
        var btnI = document.getElementById('emptyGoIelts');
        var btnG = document.getElementById('emptyGoGrade');
        if (btnI) btnI.onclick = function () { gotoTab('ielts'); };
        if (btnG) btnG.onclick = function () { gotoTab('grade'); };
      } else if (deck && studyQueue.length === 0 && deck.cards.length > 0) {
        // 有卡但今日已学完(都被 lastReview 推迟到明天)
        var fc3 = document.querySelector('.flashcard');
        if (fc3) { fc3.style.height = 'auto'; fc3.style.minHeight = '220px'; }
        var masteredToday = deck.cards.filter(function (c) { return c.lastReview && c.due > now(); }).length;
        cardFront.innerHTML = '<div style="text-align:center;line-height:1.6;">' +
          '<div style="font-size:42px;margin-bottom:6px;">🎉</div>' +
          '<div style="font-size:16px;font-weight:600;color:var(--ink);">今日学习完成!</div>' +
          '<div style="font-size:12px;color:var(--muted);margin:4px 0 10px;">「' + esc(deck.name) + '」共 ' + deck.cards.length + ' 张 · 已掌握 ' + masteredToday + ' 张<br>明天再来看新一批复习</div>' +
          '<button id="emptyGoAdd" class="btn btn-ghost" style="margin:0;padding:8px 12px;font-size:12px;border-radius:10px;">➕ 继续加新词</button>' +
          '</div>';
        cardBack.textContent = '休息一下,明天自动续上';
        cardDeckName.textContent = deck.name;
        progressLabel.textContent = deck.cards.length + ' / ' + deck.cards.length;
        var btnA = document.getElementById('emptyGoAdd');
        if (btnA) btnA.onclick = function () { gotoTab('ielts'); };
      } else {
        cardFront.textContent = '📭 暂无待复习卡片';
        cardBack.textContent = deck ? '本卡组今日复习完成,休息一下' : '请选择一个卡组';
        cardDeckName.textContent = deck ? deck.name : '—';
        progressLabel.textContent = doneThisSession + ' / ' + totalForSession;
      }
      return;
    }
    currentCard = studyQueue.shift();
    var fc2 = document.querySelector('.flashcard');
    if (fc2) { fc2.style.height = '220px'; fc2.style.minHeight = ''; }
    cardFront.textContent = currentCard.front;
    cardBack.textContent = currentCard.back;
    cardDeckName.textContent = deck.name;
    // 有卡时恢复显示评分按钮
    if (ratingRow) ratingRow.style.display = '';
  }

  /**
   * 切换到指定 tab (并滚动到编辑区)
   * 用于空状态按钮:点击后让用户看到词库。
   */
  function gotoTab(key) {
    var tab = document.querySelector('.tab[data-tab="' + key + '"]');
    if (tab) tab.click();
    // 滚动到该 panel 的位置
    var panel = document.getElementById('panel-' + key);
    if (panel && panel.scrollIntoView) panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function updateProgress() {
    var pct = totalForSession ? Math.round((doneThisSession / totalForSession) * 100) : 0;
    progressFill.style.width = pct + '%';
    progressLabel.textContent = doneThisSession + ' / ' + totalForSession;
    var gpct = Math.min(1, state.goalDone / state.goalTarget);
    var circ = 2 * Math.PI * 24;
    goalRing.setAttribute('stroke-dasharray', circ);
    goalRing.setAttribute('stroke-dashoffset', circ * (1 - gpct));
    goalRing.setAttribute('stroke', gpct >= 1 ? accent3 : accent);
    goalDone.textContent = state.goalDone;
    goalTarget.textContent = state.goalTarget;
  }

  flashcard.addEventListener('click', function () {
    if (!currentCard) return;
    isFlipped = !isFlipped;
    flashcard.classList.toggle('flipped', isFlipped);
    setRatingReady(isFlipped);
  });
  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
    if (e.code === 'Space') { e.preventDefault(); flashcard.click(); }
    if (['1','2','3'].indexOf(e.key) >= 0 && currentCard) { rate(+e.key); }
  });

  function rate(q) {
    if (!currentCard) return;
    if (!isFlipped) {
      flashcard.click();
      showToast('先看答案,再按回忆程度评分', 'info');
      return;
    }
    applyRate(currentCard, q);
    saveState();
    doneThisSession++;
    var k = todayKey();
    // 每日已学:不管评分都 +1(只要"打开看过")
    state.dailyLog = state.dailyLog || {};
    state.dailyLog[k] = (state.dailyLog[k] || 0) + 1;
    if (q === 3) {
      state.goalDone = (state.goalDone || 0) + 1;
      flashcardWrap.classList.add('glow');
      showToast('✓ 已记住 · ' + currentCard.interval + ' 天后复习', 'success');
    } else if (q === 1) {
      studyQueue.push(currentCard);
      totalForSession = Math.max(totalForSession, doneThisSession + studyQueue.length);
      flashcardWrap.classList.add('shake');
      showToast('↻ 已放到本组末尾再练', 'warn');
    } else {
      showToast('⏭ 已跳过,下次还在', 'info');
    }
    // 累计 mastery 历史
    if (!state.history) state.history = [];
    var last = state.history[state.history.length - 1];
    if (last && last.day === k) {
      last.mastery = Math.max(0, Math.min(1, last.mastery + (q === 3 ? 0.015 : (q === 1 ? -0.005 : 0))));
      last.count = (last.count || 0) + 1;
    } else {
      state.history.push({ day: k, mastery: q === 3 ? 0.6 : 0.4, count: 1 });
      if (state.history.length > 60) state.history.shift();
    }
    // streak
    if (state.lastDay !== k) {
      var y = new Date(); y.setDate(y.getDate() - 1);
      if (state.lastDay === y.toISOString().slice(0, 10)) state.streak = (state.streak || 0) + 1;
      else state.streak = 1;
      state.lastDay = k;
    }
    saveState();
    updateProgress();
    updateStats();
    renderDecks();
    renderChart();
    updateTopStats();
    setTimeout(showNext, 400);
  }
  Array.prototype.forEach.call(document.querySelectorAll('.rate-btn'), function (b) {
    b.addEventListener('click', function () { rate(+b.dataset.rate); });
  });

  /* ---------- Stats ---------- */
  function updateStats() {
    var total = 0, due = 0, mastered = 0;
    var tomorrowCutoff = addDays(now(), 86400000);
    var weekCutoff = addDays(now(), 7 * 86400000);
    state.decks.forEach(function (d) {
      d.cards.forEach(function (c) {
        total++;
        if (c.due <= now()) due++;
        if (c.rep >= 3 && c.ef >= 2.3) mastered++;
      });
    });
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-due').textContent = due;
    document.getElementById('stat-streak').textContent = state.streak || 0;
    var mastery = total ? Math.round((mastered / total) * 100) : 0;
    document.getElementById('stat-mastery').textContent = mastery + '%';

    var tom = 0, week = 0;
    state.decks.forEach(function (d) {
      d.cards.forEach(function (c) {
        if (c.due > now() && c.due <= tomorrowCutoff) tom++;
        if (c.due > now() && c.due <= weekCutoff) week++;
      });
    });
    document.getElementById('due-today').textContent = due;
    document.getElementById('due-tomorrow').textContent = tom;
    document.getElementById('due-week').textContent = week;
    document.getElementById('due-mastered').textContent = mastered;
  }

  /* ---------- Editor: tabs ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (t) {
    t.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(function (x) { x.classList.remove('active'); });
      t.classList.add('active');
      ['bulk', 'single', 'ielts', 'grade', 'middle', 'oldmiddle', 'highschool'].forEach(function (k) {
        var el = document.getElementById('panel-' + k);
        if (el) el.style.display = (t.dataset.tab === k) ? 'block' : 'none';
      });
      if (t.dataset.tab === 'grade') {
        renderGrade();
      }
      if (t.dataset.tab === 'middle') {
        renderMiddle();
      }
      if (t.dataset.tab === 'oldmiddle') {
        renderOldMiddle();
      }
      if (t.dataset.tab === 'highschool') {
        renderHighSchool();
      }
    });
  });

  /**
   * 根据当前 active tab 显示对应 panel。
   * 解决:HTML 中所有 panel 默认 display:none,但默认 active 是 ielts,
   *      如果不在 init 主动显示,首次进入页面 panel 永远空白。
   */
  function syncActivePanel() {
    var activeTab = document.querySelector('.tab.active');
    var activeKey = activeTab ? activeTab.dataset.tab : 'ielts';
    ['bulk', 'single', 'ielts', 'grade', 'middle', 'oldmiddle', 'highschool'].forEach(function (k) {
      var el = document.getElementById('panel-' + k);
      if (el) el.style.display = (activeKey === k) ? 'block' : 'none';
    });
    if (activeKey === 'grade') renderGrade();
    if (activeKey === 'ielts') renderIelts();
    if (activeKey === 'middle') renderMiddle();
    if (activeKey === 'oldmiddle') renderOldMiddle();
    if (activeKey === 'highschool') renderHighSchool();
  }

  /**
   * 主动重建复习队列并刷新主显示区。
   * 在「+加入 / 批量导入 / 切换卡组」等任何会改变 deck.cards 的场景后调用。
   */
  function refreshStudy() {
    buildQueue();
    showNext();
  }

  function refreshDeckSelect() {
    ['bulkDeck', 'singleDeck', 'ieltsDeck', 'gradeDeck', 'middleDeck', 'oldMiddleDeck', 'highSchoolDeck'].forEach(function (id) {
      var sel = document.getElementById(id);
      if (!sel) return;
      sel.innerHTML = '';
      state.decks.forEach(function (d) {
        var op = document.createElement('option');
        op.value = d.id; op.textContent = d.name;
        sel.appendChild(op);
      });
    });
  }

  document.getElementById('bulkAddBtn').addEventListener('click', function () {
    var raw = document.getElementById('bulkInput').value.trim();
    if (!raw) { showToast('⚠️ 请先输入内容', 'warn'); document.getElementById('bulkInput').focus(); return; }
    var lines = raw.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    var count = 0;
    var deckId = document.getElementById('bulkDeck').value;
    var deck = state.decks.find(function (d) { return d.id === deckId; });
    lines.forEach(function (ln) {
      var parts = ln.split('|').map(function (s) { return s.trim(); });
      if (parts.length >= 2 && parts[0] && parts[1]) {
        deck.cards.push({ id: nid(), front: parts[0], back: parts.slice(1).join(' | '), ef: 2.5, rep: 0, interval: 0, due: now(), added: now(), lastReview: null, skip: false });
        count++;
      }
    });
    document.getElementById('preview').textContent = '✓ 成功导入 ' + count + ' 张卡片到「' + deck.name + '」';
    document.getElementById('bulkInput').value = '';
    saveState();
    renderDecks();
    updateStats();
    renderChart();
    refreshStudy();                    // ★ 刷新主显示区,卡片立即出现
    if (activeDeckId === deck.id) {
      showToast('✓ 已加入 ' + count + ' 张 · 回到顶部开始复习', 'success');
    } else {
      activeDeckId = deck.id;
      renderDecks();
      refreshStudy();
      showToast('✓ 已切换到「' + deck.name + '」并加入 ' + count + ' 张', 'success');
    }
  });
  document.getElementById('singleAddBtn').addEventListener('click', function () {
    var f = document.getElementById('singleFront').value.trim();
    var b = document.getElementById('singleBack').value.trim();
    if (!f || !b) { showToast('⚠️ 请填写完整的问题和答案', 'warn'); return; }
    var deckId = document.getElementById('singleDeck').value;
    var deck = state.decks.find(function (d) { return d.id === deckId; });
    deck.cards.push({ id: nid(), front: f, back: b, ef: 2.5, rep: 0, interval: 0, due: now(), added: now(), lastReview: null, skip: false });
    saveState();
    document.getElementById('singleFront').value = '';
    document.getElementById('singleBack').value = '';
    renderDecks();
    updateStats();
    refreshStudy();                    // ★ 刷新主显示区
    showToast('✓ 卡片已添加到「' + deck.name + '」', 'success');
  });

  /* ---------- 雅思词库 ---------- */
  function cardExists(deck, front) {
    return !!(deck && deck.cards && deck.cards.some(function (c) { return c.front.toLowerCase() === front.toLowerCase(); }));
  }
  var TAG_LABELS = { R: '阅读', L: '听力', W: '写作', A: '学术' };
  function renderVocabCard(pair, idx, options) {
    var added = cardExists(options.deck, pair[0]);
    var card = document.createElement('div');
    card.className = 'vocab-card' + (added ? ' added' : '');
    var checkbox = options.checkable
      ? '<label><input type="checkbox" data-grade-pick="' + idx + '"' + (added ? ' disabled' : '') + '> 选择</label>'
      : '<span class="idx">' + options.typeLabel + '</span>';
    // 构建 tag 标签 HTML
    var tagHtml = '';
    if (pair[2]) {
      pair[2].split(' ').forEach(function (t) {
        tagHtml += '<span class="vocab-tag tag-' + t + '">' + (TAG_LABELS[t] || t) + '</span>';
      });
    }
    card.innerHTML =
      '<div class="top"><div><div class="idx">#' + String(idx + 1).padStart(2, '0') + '</div><div class="word">' + esc(pair[0]) + '</div></div></div>' +
      '<div class="meaning">' + esc(pair[1]) + tagHtml + '</div>' +
      '<div class="bottom">' +
        checkbox +
        '<button data-' + options.action + '="' + idx + '" class="' + (added ? 'added' : '') + '"' + (added ? ' disabled' : '') + '>' + (added ? '✓ 已加入' : '+ 加入') + '</button>' +
      '</div>';
    return card;
  }
  function setVocabSummary(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }
  function renderIelts(keyword, tag, filter) {
    var list = document.getElementById('ieltsList');
    if (!list) return;
    var deckId = document.getElementById('ieltsDeck').value;
    var deck = state.decks.find(function (d) { return d.id === deckId; });
    list.innerHTML = '<div class="vocab-grid"></div>';
    var grid = list.firstChild;
    var kw = (keyword || '').toLowerCase();
    var tagVal = tag !== undefined ? tag : (document.getElementById('ieltsTag') ? document.getElementById('ieltsTag').value : '');
    var filterVal = filter !== undefined ? filter : (document.getElementById('ieltsFilter') ? document.getElementById('ieltsFilter').value : '');
    var matches = 0;
    var addedCount = 0;
    IELTS_VOCAB.forEach(function (pair, idx) {
      // 关键词筛选
      if (kw && pair[0].toLowerCase().indexOf(kw) < 0 && pair[1].toLowerCase().indexOf(kw) < 0) return;
      // 分类标签筛选
      if (tagVal && (!pair[2] || pair[2].indexOf(tagVal) < 0)) return;
      // 已加入/未加入筛选
      var exists = cardExists(deck, pair[0]);
      if (filterVal === 'added' && !exists) return;
      if (filterVal === 'new' && exists) return;
      matches++;
      if (exists) addedCount++;
      grid.appendChild(renderVocabCard(pair, idx, { deck: deck, action: 'ielts-add', typeLabel: '雅思', checkable: false }));
    });
    if (matches === 0) {
      list.innerHTML = '<div class="vocab-empty">没有匹配「' + esc(keyword) + '」的单词</div>';
    }
    setVocabSummary('ieltsSummary', '<span>显示 <b>' + matches + '</b> / ' + IELTS_VOCAB.length + ' 个词 · 当前卡组已加入 <b>' + addedCount + '</b> 个</span><span>建议先导入 20 个试背,熟悉后再全量导入</span>');
    list.querySelectorAll('[data-ielts-add]').forEach(function (b) {
      b.addEventListener('click', function () {
        var idx = +b.dataset.ieltsAdd;
        var pair = IELTS_VOCAB[idx];
        var deckId = document.getElementById('ieltsDeck').value;
        var deck = state.decks.find(function (d) { return d.id === deckId; });
        if (!deck) return;
        // 防重:同 front 不重复加
        if (deck.cards.some(function (c) { return c.front.toLowerCase() === pair[0].toLowerCase(); })) {
          showToast('「' + pair[0] + '」已在该卡组中', 'warn');
          return;
        }
        deck.cards.push({ id: nid(), front: pair[0], back: pair[1], ef: 2.5, rep: 0, interval: 0, due: now(), added: now(), lastReview: null, skip: false, _src: 'vocab' });
        saveState();
        renderDecks();
        updateStats();
        renderIelts(document.getElementById('ieltsSearch').value.trim().toLowerCase());
        // ★ 关键:同步切换到该 deck 并刷新主显示区
        var wasActive = (activeDeckId === deck.id);
        activeDeckId = deck.id;
        renderDecks();
        refreshStudy();
        showToast(wasActive ? '✓ 已加入「' + pair[0] + '」· 上方自动开始' : '✓ 已切换到「' + deck.name + '」并加入「' + pair[0] + '」', 'success');
      });
    });
  }
  function importIeltsBatch(n) {
    var deckId = document.getElementById('ieltsDeck').value;
    var deck = state.decks.find(function (d) { return d.id === deckId; });
    if (!deck) { showToast('⚠️ 请先选择一个卡组', 'warn'); return; }
    var added = 0;
    var list = IELTS_VOCAB.slice(0, n).map(function (p) { return [p[0], p[1]]; });
    list.forEach(function (pair) {
      if (!deck.cards.some(function (c) { return c.front.toLowerCase() === pair[0].toLowerCase(); })) {
        deck.cards.push({ id: nid(), front: pair[0], back: pair[1], ef: 2.5, rep: 0, interval: 0, due: now(), added: now(), lastReview: null, skip: false, _src: 'vocab' });
        added++;
      }
    });
    saveState();
    renderDecks();
    updateStats();
    renderIelts();
    // ★ 切换到该 deck 并刷新主显示区
    var wasActive = (activeDeckId === deck.id);
    activeDeckId = deck.id;
    renderDecks();
    refreshStudy();
    showToast('✓ 成功导入 ' + added + ' 张到「' + deck.name + '」· ' + (wasActive ? '已立即进入复习' : '已切换卡组'), 'success');
  }
  document.getElementById('ieltsImportAll').addEventListener('click', function () { importIeltsBatch(IELTS_VOCAB.length); });
  document.getElementById('ieltsImport20').addEventListener('click', function () { importIeltsBatch(20); });

  /* ---------- 小学词库(人教版PEP 3-6年级) ---------- */
  // gradeLabel: 将 key('3上'等)转为中文显示名
  var GRADE_LABEL_MAP = {
    '3上': '三年级上', '3下': '三年级下',
    '4上': '四年级上', '4下': '四年级下',
    '5上': '五年级上', '5下': '五年级下',
    '6上': '六年级上', '6下': '六年级下'
  };
  function gradeLabel(key) { return GRADE_LABEL_MAP[key] || key; }
  // gradeList: 返回指定册所有词的扁平数组
  function gradeList(grade) {
    var units = GRADE_VOCAB[grade];
    if (!units) return [];
    var result = [];
    Object.keys(units).forEach(function (unitName) {
      units[unitName].forEach(function (pair) {
        result.push(pair);
      });
    });
    return result;
  }
  // gradeUnitList: 返回指定年级+单元的词数组
  function gradeUnitList(grade, unit) {
    var units = GRADE_VOCAB[grade];
    if (!units || !unit) return [];
    return units[unit] || [];
  }
  // gradeUnitNames: 返回指定年级的所有单元名
  function gradeUnitNames(grade) {
    var units = GRADE_VOCAB[grade];
    if (!units) return [];
    return Object.keys(units);
  }
  // fillUnitPick: 根据当前年级填充 unitPick 下拉
  function fillUnitPick(grade) {
    var sel = document.getElementById('unitPick');
    if (!sel) return;
    var names = gradeUnitNames(grade);
    sel.innerHTML = '<option value="">全部单元</option>';
    names.forEach(function (name) {
      var opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      sel.appendChild(opt);
    });
  }

  function renderGrade(keyword) {
    var list = document.getElementById('gradeList');
    if (!list) return;
    var grade = document.getElementById('gradePick').value;
    var unit = document.getElementById('unitPick').value;
    var deckId = document.getElementById('gradeDeck').value;
    var deck = state.decks.find(function (d) { return d.id === deckId; });
    // 根据是否选了单元来决定数据源
    var data = unit ? gradeUnitList(grade, unit) : gradeList(grade);
    var kw = (keyword || '').toLowerCase();
    list.innerHTML = '<div class="vocab-grid"></div>';
    var grid = list.firstChild;
    var matches = 0;
    var addedCount = 0;
    var gLabel = gradeLabel(grade);
    data.forEach(function (pair, idx) {
      if (kw && pair[0].toLowerCase().indexOf(kw) < 0 && pair[1].toLowerCase().indexOf(kw) < 0) return;
      matches++;
      if (cardExists(deck, pair[0])) addedCount++;
      var label = unit ? (gLabel + ' · ' + unit) : gLabel;
      grid.appendChild(renderVocabCard(pair, idx, { deck: deck, action: 'grade-add', typeLabel: label, checkable: true }));
    });
    if (matches === 0) {
      list.innerHTML = '<div class="vocab-empty">没有匹配「' + esc(keyword) + '」的单词</div>';
    }
    var summaryText = unit
      ? (gLabel + ' · ' + unit + ' 显示 <b>' + matches + '</b> 个词 · 当前卡组已加入 <b>' + addedCount + '</b> 个')
      : (gLabel + ' · 全部单元 显示 <b>' + matches + '</b> 个词 · 当前卡组已加入 <b>' + addedCount + '</b> 个');
    setVocabSummary('gradeSummary', '<span>' + summaryText + '</span><span>可勾选后批量加入</span>');
    list.querySelectorAll('[data-grade-add]').forEach(function (b) {
      b.addEventListener('click', function () {
        var idx = +b.dataset.gradeAdd;
        var pair = data[idx];
        var deckId = document.getElementById('gradeDeck').value;
        var deck = state.decks.find(function (d) { return d.id === deckId; });
        if (!deck) return;
        if (deck.cards.some(function (c) { return c.front.toLowerCase() === pair[0].toLowerCase(); })) {
          showToast('「' + pair[0] + '」已在该卡组中', 'warn');
          return;
        }
        deck.cards.push({ id: nid(), front: pair[0], back: pair[1], added: now(), due: now(), lastReview: null, skip: false, _src: 'grade' });
        saveState();
        renderDecks(); updateStats();
        renderGrade(document.getElementById('gradeSearch').value.trim().toLowerCase());
        // ★ 切换 + 刷新
        var wasActive = (activeDeckId === deck.id);
        activeDeckId = deck.id;
        renderDecks();
        refreshStudy();
        showToast(wasActive ? '✓ 已加入「' + pair[0] + '」· 上方自动开始' : '✓ 已切换到「' + deck.name + '」并加入「' + pair[0] + '」', 'success');
      });
    });
  }

  document.getElementById('gradePick').addEventListener('change', function () {
    var grade = this.value;
    fillUnitPick(grade);
    renderGrade(document.getElementById('gradeSearch').value.trim().toLowerCase());
  });
  document.getElementById('unitPick').addEventListener('change', function () {
    renderGrade(document.getElementById('gradeSearch').value.trim().toLowerCase());
  });
  document.getElementById('gradeSearch').addEventListener('input', function () { renderGrade(this.value.trim().toLowerCase()); });
  document.getElementById('gradeImportAll').addEventListener('click', function () {
    var grade = document.getElementById('gradePick').value;
    var unit = document.getElementById('unitPick').value;
    var deckId = document.getElementById('gradeDeck').value;
    var deck = state.decks.find(function (d) { return d.id === deckId; });
    if (!deck) return;
    var data = unit ? gradeUnitList(grade, unit) : gradeList(grade);
    var added = 0;
    data.forEach(function (pair) {
      if (deck.cards.some(function (c) { return c.front.toLowerCase() === pair[0].toLowerCase(); })) return;
      deck.cards.push({ id: nid(), front: pair[0], back: pair[1], added: now(), due: now(), lastReview: null, skip: false, _src: 'grade' });
      added++;
    });
    saveState(); renderDecks(); updateStats();
    // ★ 切换 + 刷新
    var wasActive = (activeDeckId === deck.id);
    activeDeckId = deck.id;
    renderDecks();
    refreshStudy();
    renderGrade(document.getElementById('gradeSearch').value.trim().toLowerCase());
    var gLabel = gradeLabel(grade);
    var scopeText = unit ? (gLabel + ' · ' + unit) : (gLabel + ' · 全部单元');
    showToast('✓ 已加入 ' + added + ' 个' + scopeText + '单词到「' + deck.name + '」· ' + (wasActive ? '立即可学' : '已切换卡组'), 'success');
  });
  document.getElementById('gradeImportCustom').addEventListener('click', function () {
    var grade = document.getElementById('gradePick').value;
    var unit = document.getElementById('unitPick').value;
    var deckId = document.getElementById('gradeDeck').value;
    var deck = state.decks.find(function (d) { return d.id === deckId; });
    if (!deck) return;
    var checked = document.querySelectorAll('#gradeList input[type=checkbox]:checked');
    if (!checked.length) { showToast('请先勾选要加入的单词', 'warn'); return; }
    var data = unit ? gradeUnitList(grade, unit) : gradeList(grade);
    var added = 0;
    checked.forEach(function (cb) {
      var idx = +cb.dataset.gradePick;
      var pair = data[idx];
      if (!pair) return;
      if (deck.cards.some(function (c) { return c.front.toLowerCase() === pair[0].toLowerCase(); })) return;
      deck.cards.push({ id: nid(), front: pair[0], back: pair[1], added: now(), due: now(), lastReview: null, skip: false, _src: 'grade' });
      added++;
    });
    saveState(); renderDecks(); updateStats();
    // ★ 切换 + 刷新
    var wasActive = (activeDeckId === deck.id);
    activeDeckId = deck.id;
    renderDecks();
    refreshStudy();
    renderGrade(document.getElementById('gradeSearch').value.trim().toLowerCase());
    showToast('✓ 已加入勾选的 ' + added + ' 个单词到「' + deck.name + '」', 'success');
  });

  /* ---------- 初中词库(人教版新目标 7-9年级) ---------- */
  function middleLabel(key) { return MIDDLE_LABEL_MAP[key] || key; }
  function middleList(grade) {
    var units = MIDDLE_VOCAB[grade];
    if (!units) return [];
    var result = [];
    Object.keys(units).forEach(function (unitName) {
      units[unitName].forEach(function (pair) {
        result.push(pair);
      });
    });
    return result;
  }
  function middleUnitList(grade, unit) {
    var units = MIDDLE_VOCAB[grade];
    if (!units || !unit) return [];
    return units[unit] || [];
  }
  function middleUnitNames(grade) {
    var units = MIDDLE_VOCAB[grade];
    if (!units) return [];
    return Object.keys(units);
  }
  function fillMiddleUnitPick(grade) {
    var sel = document.getElementById('middleUnitPick');
    if (!sel) return;
    var names = middleUnitNames(grade);
    sel.innerHTML = '<option value="">全部单元</option>';
    names.forEach(function (name) {
      var opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      sel.appendChild(opt);
    });
  }
  function renderMiddle(keyword) {
    var list = document.getElementById('middleGrid');
    if (!list) return;
    var grade = document.getElementById('middlePick').value;
    var unit = document.getElementById('middleUnitPick').value;
    var deckId = document.getElementById('middleDeck').value;
    var deck = state.decks.find(function (d) { return d.id === deckId; });
    var data = unit ? middleUnitList(grade, unit) : middleList(grade);
    var kw = (keyword || '').toLowerCase();
    list.innerHTML = '';
    var matches = 0;
    var addedCount = 0;
    var mLabel = middleLabel(grade);
    data.forEach(function (pair, idx) {
      if (kw && pair[0].toLowerCase().indexOf(kw) < 0 && pair[1].toLowerCase().indexOf(kw) < 0) return;
      matches++;
      if (cardExists(deck, pair[0])) addedCount++;
      var label = unit ? (mLabel + ' · ' + unit) : mLabel;
      list.appendChild(renderVocabCard(pair, idx, { deck: deck, action: 'middle-add', typeLabel: label, checkable: true }));
    });
    if (matches === 0) {
      list.innerHTML = '<div class="vocab-empty">没有匹配「' + esc(keyword) + '」的单词</div>';
    }
    var summaryText = unit
      ? (mLabel + ' · ' + unit + ' 显示 <b>' + matches + '</b> 个词 · 当前卡组已加入 <b>' + addedCount + '</b> 个')
      : (mLabel + ' · 全部单元 显示 <b>' + matches + '</b> 个词 · 当前卡组已加入 <b>' + addedCount + '</b> 个');
    setVocabSummary('middleSummary', '<span>' + summaryText + '</span><span>可勾选后批量加入</span>');
    list.querySelectorAll('[data-middle-add]').forEach(function (b) {
      b.addEventListener('click', function () {
        var idx = +b.dataset.middleAdd;
        var pair = data[idx];
        var deckId = document.getElementById('middleDeck').value;
        var deck = state.decks.find(function (d) { return d.id === deckId; });
        if (!deck) return;
        if (deck.cards.some(function (c) { return c.front.toLowerCase() === pair[0].toLowerCase(); })) {
          showToast('「' + pair[0] + '」已在该卡组中', 'warn');
          return;
        }
        deck.cards.push({ id: nid(), front: pair[0], back: pair[1], added: now(), due: now(), lastReview: null, skip: false, _src: 'vocab' });
        saveState();
        renderDecks(); updateStats();
        renderMiddle(document.getElementById('middleSearch').value.trim().toLowerCase());
        var wasActive = (activeDeckId === deck.id);
        activeDeckId = deck.id;
        renderDecks();
        refreshStudy();
        showToast(wasActive ? '✓ 已加入「' + pair[0] + '」· 上方自动开始' : '✓ 已切换到「' + deck.name + '」并加入「' + pair[0] + '」', 'success');
      });
    });
  }
  document.getElementById('middlePick').addEventListener('change', function () {
    var grade = this.value;
    fillMiddleUnitPick(grade);
    renderMiddle(document.getElementById('middleSearch').value.trim().toLowerCase());
  });
  document.getElementById('middleUnitPick').addEventListener('change', function () {
    renderMiddle(document.getElementById('middleSearch').value.trim().toLowerCase());
  });
  document.getElementById('middleSearch').addEventListener('input', function () { renderMiddle(this.value.trim().toLowerCase()); });
  document.getElementById('middleImportAll').addEventListener('click', function () {
    var grade = document.getElementById('middlePick').value;
    var unit = document.getElementById('middleUnitPick').value;
    var deckId = document.getElementById('middleDeck').value;
    var deck = state.decks.find(function (d) { return d.id === deckId; });
    if (!deck) return;
    var data = unit ? middleUnitList(grade, unit) : middleList(grade);
    var added = 0;
    data.forEach(function (pair) {
      if (deck.cards.some(function (c) { return c.front.toLowerCase() === pair[0].toLowerCase(); })) return;
      deck.cards.push({ id: nid(), front: pair[0], back: pair[1], added: now(), due: now(), lastReview: null, skip: false, _src: 'vocab' });
      added++;
    });
    saveState(); renderDecks(); updateStats();
    var wasActive = (activeDeckId === deck.id);
    activeDeckId = deck.id;
    renderDecks();
    refreshStudy();
    renderMiddle(document.getElementById('middleSearch').value.trim().toLowerCase());
    var mLabel = middleLabel(grade);
    var scopeText = unit ? (mLabel + ' · ' + unit) : (mLabel + ' · 全部单元');
    showToast('✓ 已加入 ' + added + ' 个' + scopeText + '单词到「' + deck.name + '」· ' + (wasActive ? '立即可学' : '已切换卡组'), 'success');
  });
  document.getElementById('middleImportCustom').addEventListener('click', function () {
    var grade = document.getElementById('middlePick').value;
    var unit = document.getElementById('middleUnitPick').value;
    var deckId = document.getElementById('middleDeck').value;
    var deck = state.decks.find(function (d) { return d.id === deckId; });
    if (!deck) return;
    var checked = document.querySelectorAll('#middleGrid input[type=checkbox]:checked');
    if (!checked.length) { showToast('请先勾选要加入的单词', 'warn'); return; }
    var data = unit ? middleUnitList(grade, unit) : middleList(grade);
    var added = 0;
    checked.forEach(function (cb) {
      var idx = +cb.dataset.middlePick;
      var pair = data[idx];
      if (!pair) return;
      if (deck.cards.some(function (c) { return c.front.toLowerCase() === pair[0].toLowerCase(); })) return;
      deck.cards.push({ id: nid(), front: pair[0], back: pair[1], added: now(), due: now(), lastReview: null, skip: false, _src: 'vocab' });
      added++;
    });
    saveState(); renderDecks(); updateStats();
    var wasActive = (activeDeckId === deck.id);
    activeDeckId = deck.id;
    renderDecks();
    refreshStudy();
    renderMiddle(document.getElementById('middleSearch').value.trim().toLowerCase());
    showToast('✓ 已加入勾选的 ' + added + ' 个单词到「' + deck.name + '」', 'success');
  });

  /* ---------- 初中旧版词库(人教版2012) ---------- */
  function oldMiddleLabel(key) { return OLD_MIDDLE_LABEL_MAP[key] || key; }
  function oldMiddleList(grade) {
    var units = OLD_MIDDLE_VOCAB[grade];
    if (!units) return [];
    var result = [];
    Object.keys(units).forEach(function (unitName) {
      units[unitName].forEach(function (pair) {
        result.push(pair);
      });
    });
    return result;
  }
  function oldMiddleUnitList(grade, unit) {
    var units = OLD_MIDDLE_VOCAB[grade];
    if (!units || !unit) return [];
    return units[unit] || [];
  }
  function oldMiddleUnitNames(grade) {
    var units = OLD_MIDDLE_VOCAB[grade];
    if (!units) return [];
    return Object.keys(units);
  }
  function fillOldMiddleUnitPick(grade) {
    var sel = document.getElementById('oldMiddleUnitPick');
    if (!sel) return;
    var names = oldMiddleUnitNames(grade);
    sel.innerHTML = '<option value="">全部单元</option>';
    names.forEach(function (name) {
      var opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      sel.appendChild(opt);
    });
  }
  function renderOldMiddle(keyword) {
    var list = document.getElementById('oldMiddleGrid');
    if (!list) return;
    var grade = document.getElementById('oldMiddlePick').value;
    var unit = document.getElementById('oldMiddleUnitPick').value;
    var deckId = document.getElementById('oldMiddleDeck').value;
    var deck = state.decks.find(function (d) { return d.id === deckId; });
    var data = unit ? oldMiddleUnitList(grade, unit) : oldMiddleList(grade);
    var kw = (keyword || '').toLowerCase();
    list.innerHTML = '';
    var matches = 0;
    var addedCount = 0;
    var mLabel = oldMiddleLabel(grade);
    data.forEach(function (pair, idx) {
      if (kw && pair[0].toLowerCase().indexOf(kw) < 0 && pair[1].toLowerCase().indexOf(kw) < 0) return;
      matches++;
      if (cardExists(deck, pair[0])) addedCount++;
      var label = unit ? (mLabel + ' · ' + unit) : mLabel;
      list.appendChild(renderVocabCard(pair, idx, { deck: deck, action: 'oldmiddle-add', typeLabel: label, checkable: true }));
    });
    if (matches === 0) {
      list.innerHTML = '<div class="vocab-empty">没有匹配「' + esc(keyword) + '」的单词</div>';
    }
    var summaryText = unit
      ? (mLabel + ' · ' + unit + ' 显示 <b>' + matches + '</b> 个词 · 当前卡组已加入 <b>' + addedCount + '</b> 个')
      : (mLabel + ' · 全部单元 显示 <b>' + matches + '</b> 个词 · 当前卡组已加入 <b>' + addedCount + '</b> 个');
    setVocabSummary('oldMiddleSummary', '<span>' + summaryText + '</span><span>可勾选后批量加入</span>');
    list.querySelectorAll('[data-oldmiddle-add]').forEach(function (b) {
      b.addEventListener('click', function () {
        var idx = +b.dataset.oldmiddleAdd;
        var pair = data[idx];
        var deckId = document.getElementById('oldMiddleDeck').value;
        var deck = state.decks.find(function (d) { return d.id === deckId; });
        if (!deck) return;
        if (deck.cards.some(function (c) { return c.front.toLowerCase() === pair[0].toLowerCase(); })) {
          showToast('「' + pair[0] + '」已在该卡组中', 'warn');
          return;
        }
        deck.cards.push({ id: nid(), front: pair[0], back: pair[1], added: now(), due: now(), lastReview: null, skip: false, _src: 'vocab' });
        saveState();
        renderDecks(); updateStats();
        renderOldMiddle(document.getElementById('oldMiddleSearch').value.trim().toLowerCase());
        var wasActive = (activeDeckId === deck.id);
        activeDeckId = deck.id;
        renderDecks();
        refreshStudy();
        showToast(wasActive ? '✓ 已加入「' + pair[0] + '」· 上方自动开始' : '✓ 已切换到「' + deck.name + '」并加入「' + pair[0] + '」', 'success');
      });
    });
  }
  document.getElementById('oldMiddlePick').addEventListener('change', function () {
    var grade = this.value;
    fillOldMiddleUnitPick(grade);
    renderOldMiddle(document.getElementById('oldMiddleSearch').value.trim().toLowerCase());
  });
  document.getElementById('oldMiddleUnitPick').addEventListener('change', function () {
    renderOldMiddle(document.getElementById('oldMiddleSearch').value.trim().toLowerCase());
  });
  document.getElementById('oldMiddleSearch').addEventListener('input', function () { renderOldMiddle(this.value.trim().toLowerCase()); });
  document.getElementById('oldMiddleImportAll').addEventListener('click', function () {
    var grade = document.getElementById('oldMiddlePick').value;
    var unit = document.getElementById('oldMiddleUnitPick').value;
    var deckId = document.getElementById('oldMiddleDeck').value;
    var deck = state.decks.find(function (d) { return d.id === deckId; });
    if (!deck) return;
    var data = unit ? oldMiddleUnitList(grade, unit) : oldMiddleList(grade);
    var added = 0;
    data.forEach(function (pair) {
      if (deck.cards.some(function (c) { return c.front.toLowerCase() === pair[0].toLowerCase(); })) return;
      deck.cards.push({ id: nid(), front: pair[0], back: pair[1], added: now(), due: now(), lastReview: null, skip: false, _src: 'vocab' });
      added++;
    });
    saveState(); renderDecks(); updateStats();
    var wasActive = (activeDeckId === deck.id);
    activeDeckId = deck.id;
    renderDecks();
    refreshStudy();
    renderOldMiddle(document.getElementById('oldMiddleSearch').value.trim().toLowerCase());
    var mLabel = oldMiddleLabel(grade);
    var scopeText = unit ? (mLabel + ' · ' + unit) : (mLabel + ' · 全部单元');
    showToast('✓ 已加入 ' + added + ' 个' + scopeText + '单词到「' + deck.name + '」· ' + (wasActive ? '立即可学' : '已切换卡组'), 'success');
  });
  document.getElementById('oldMiddleImportCustom').addEventListener('click', function () {
    var grade = document.getElementById('oldMiddlePick').value;
    var unit = document.getElementById('oldMiddleUnitPick').value;
    var deckId = document.getElementById('oldMiddleDeck').value;
    var deck = state.decks.find(function (d) { return d.id === deckId; });
    if (!deck) return;
    var checked = document.querySelectorAll('#oldMiddleGrid input[type=checkbox]:checked');
    if (!checked.length) { showToast('请先勾选要加入的单词', 'warn'); return; }
    var data = unit ? oldMiddleUnitList(grade, unit) : oldMiddleList(grade);
    var added = 0;
    checked.forEach(function (cb) {
      var idx = +cb.dataset.oldmiddlePick;
      var pair = data[idx];
      if (!pair) return;
      if (deck.cards.some(function (c) { return c.front.toLowerCase() === pair[0].toLowerCase(); })) return;
      deck.cards.push({ id: nid(), front: pair[0], back: pair[1], added: now(), due: now(), lastReview: null, skip: false, _src: 'vocab' });
      added++;
    });
    saveState(); renderDecks(); updateStats();
    var wasActive = (activeDeckId === deck.id);
    activeDeckId = deck.id;
    renderDecks();
    refreshStudy();
    renderOldMiddle(document.getElementById('oldMiddleSearch').value.trim().toLowerCase());
    showToast('✓ 已加入勾选的 ' + added + ' 个单词到「' + deck.name + '」', 'success');
  });

  /* ---------- 高中词库(人教版) ---------- */
  function highSchoolLabel(key) { return HIGH_SCHOOL_LABEL_MAP[key] || key; }
  function highSchoolList(grade) {
    var units = HIGH_SCHOOL_VOCAB[grade];
    if (!units) return [];
    var result = [];
    Object.keys(units).forEach(function (unitName) {
      units[unitName].forEach(function (pair) {
        result.push(pair);
      });
    });
    return result;
  }
  function highSchoolUnitList(grade, unit) {
    var units = HIGH_SCHOOL_VOCAB[grade];
    if (!units || !unit) return [];
    return units[unit] || [];
  }
  function highSchoolUnitNames(grade) {
    var units = HIGH_SCHOOL_VOCAB[grade];
    if (!units) return [];
    return Object.keys(units);
  }
  function fillHighSchoolUnitPick(grade) {
    var sel = document.getElementById('highSchoolUnitPick');
    if (!sel) return;
    var names = highSchoolUnitNames(grade);
    sel.innerHTML = '<option value="">全部单元</option>';
    names.forEach(function (name) {
      var opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      sel.appendChild(opt);
    });
  }
  function renderHighSchool(keyword) {
    var list = document.getElementById('highSchoolGrid');
    if (!list) return;
    var grade = document.getElementById('highSchoolPick').value;
    var unit = document.getElementById('highSchoolUnitPick').value;
    var deckId = document.getElementById('highSchoolDeck').value;
    var deck = state.decks.find(function (d) { return d.id === deckId; });
    var data = unit ? highSchoolUnitList(grade, unit) : highSchoolList(grade);
    var kw = (keyword || '').toLowerCase();
    list.innerHTML = '';
    var matches = 0;
    var addedCount = 0;
    var mLabel = highSchoolLabel(grade);
    data.forEach(function (pair, idx) {
      if (kw && pair[0].toLowerCase().indexOf(kw) < 0 && pair[1].toLowerCase().indexOf(kw) < 0) return;
      matches++;
      if (cardExists(deck, pair[0])) addedCount++;
      var label = unit ? (mLabel + ' · ' + unit) : mLabel;
      list.appendChild(renderVocabCard(pair, idx, { deck: deck, action: 'highschool-add', typeLabel: label, checkable: true }));
    });
    if (matches === 0) {
      list.innerHTML = '<div class="vocab-empty">没有匹配「' + esc(keyword) + '」的单词</div>';
    }
    var summaryText = unit
      ? (mLabel + ' · ' + unit + ' 显示 <b>' + matches + '</b> 个词 · 当前卡组已加入 <b>' + addedCount + '</b> 个')
      : (mLabel + ' · 全部单元 显示 <b>' + matches + '</b> 个词 · 当前卡组已加入 <b>' + addedCount + '</b> 个');
    setVocabSummary('highSchoolSummary', '<span>' + summaryText + '</span><span>可勾选后批量加入</span>');
    list.querySelectorAll('[data-highschool-add]').forEach(function (b) {
      b.addEventListener('click', function () {
        var idx = +b.dataset.highschoolAdd;
        var pair = data[idx];
        var deckId = document.getElementById('highSchoolDeck').value;
        var deck = state.decks.find(function (d) { return d.id === deckId; });
        if (!deck) return;
        if (deck.cards.some(function (c) { return c.front.toLowerCase() === pair[0].toLowerCase(); })) {
          showToast('「' + pair[0] + '」已在该卡组中', 'warn');
          return;
        }
        deck.cards.push({ id: nid(), front: pair[0], back: pair[1], added: now(), due: now(), lastReview: null, skip: false, _src: 'vocab' });
        saveState();
        renderDecks(); updateStats();
        renderHighSchool(document.getElementById('highSchoolSearch').value.trim().toLowerCase());
        var wasActive = (activeDeckId === deck.id);
        activeDeckId = deck.id;
        renderDecks();
        refreshStudy();
        showToast(wasActive ? '✓ 已加入「' + pair[0] + '」· 上方自动开始' : '✓ 已切换到「' + deck.name + '」并加入「' + pair[0] + '」', 'success');
      });
    });
  }
  document.getElementById('highSchoolPick').addEventListener('change', function () {
    var grade = this.value;
    fillHighSchoolUnitPick(grade);
    renderHighSchool(document.getElementById('highSchoolSearch').value.trim().toLowerCase());
  });
  document.getElementById('highSchoolUnitPick').addEventListener('change', function () {
    renderHighSchool(document.getElementById('highSchoolSearch').value.trim().toLowerCase());
  });
  document.getElementById('highSchoolSearch').addEventListener('input', function () { renderHighSchool(this.value.trim().toLowerCase()); });
  document.getElementById('highSchoolImportAll').addEventListener('click', function () {
    var grade = document.getElementById('highSchoolPick').value;
    var unit = document.getElementById('highSchoolUnitPick').value;
    var deckId = document.getElementById('highSchoolDeck').value;
    var deck = state.decks.find(function (d) { return d.id === deckId; });
    if (!deck) return;
    var data = unit ? highSchoolUnitList(grade, unit) : highSchoolList(grade);
    var added = 0;
    data.forEach(function (pair) {
      if (deck.cards.some(function (c) { return c.front.toLowerCase() === pair[0].toLowerCase(); })) return;
      deck.cards.push({ id: nid(), front: pair[0], back: pair[1], added: now(), due: now(), lastReview: null, skip: false, _src: 'vocab' });
      added++;
    });
    saveState(); renderDecks(); updateStats();
    var wasActive = (activeDeckId === deck.id);
    activeDeckId = deck.id;
    renderDecks();
    refreshStudy();
    renderHighSchool(document.getElementById('highSchoolSearch').value.trim().toLowerCase());
    var mLabel = highSchoolLabel(grade);
    var scopeText = unit ? (mLabel + ' · ' + unit) : (mLabel + ' · 全部单元');
    showToast('✓ 已加入 ' + added + ' 个' + scopeText + '单词到「' + deck.name + '」· ' + (wasActive ? '立即可学' : '已切换卡组'), 'success');
  });
  document.getElementById('highSchoolImportCustom').addEventListener('click', function () {
    var grade = document.getElementById('highSchoolPick').value;
    var unit = document.getElementById('highSchoolUnitPick').value;
    var deckId = document.getElementById('highSchoolDeck').value;
    var deck = state.decks.find(function (d) { return d.id === deckId; });
    if (!deck) return;
    var checked = document.querySelectorAll('#highSchoolGrid input[type=checkbox]:checked');
    if (!checked.length) { showToast('请先勾选要加入的单词', 'warn'); return; }
    var data = unit ? highSchoolUnitList(grade, unit) : highSchoolList(grade);
    var added = 0;
    checked.forEach(function (cb) {
      var idx = +cb.dataset.highschoolPick;
      var pair = data[idx];
      if (!pair) return;
      if (deck.cards.some(function (c) { return c.front.toLowerCase() === pair[0].toLowerCase(); })) return;
      deck.cards.push({ id: nid(), front: pair[0], back: pair[1], added: now(), due: now(), lastReview: null, skip: false, _src: 'vocab' });
      added++;
    });
    saveState(); renderDecks(); updateStats();
    var wasActive = (activeDeckId === deck.id);
    activeDeckId = deck.id;
    renderDecks();
    refreshStudy();
    renderHighSchool(document.getElementById('highSchoolSearch').value.trim().toLowerCase());
    showToast('✓ 已加入勾选的 ' + added + ' 个单词到「' + deck.name + '」', 'success');
  });

  /* ---------- Chart ---------- */
  function hasEcharts() {
    return typeof window.echarts !== 'undefined' && window.echarts && typeof window.echarts.init === 'function';
  }
  function setChartFallback(text) {
    var el = document.getElementById('chart-mastery');
    if (!el) return;
    el.innerHTML = '<div style="min-height:260px;display:flex;align-items:center;justify-content:center;text-align:center;color:var(--muted);background:rgba(15,14,23,0.04);border-radius:18px;padding:18px;">' + text + '</div>';
  }
  var chartEl = document.getElementById('chart-mastery');
  var chart = hasEcharts() && chartEl ? window.echarts.init(chartEl, null, { renderer: 'svg' }) : null;
  function renderChart() {
    var hist = (state.history && state.history.length) ? state.history : [];
    if (!chart) {
      setChartFallback(hist.length ? '图表库暂不可用,学习记录已正常保存' : '暂无学习记录<br>开始第一次复习后会自动生成');
      return;
    }
    if (!hist.length) {
      chart.clear();
      chart.setOption({
        animation: false,
        graphic: [{
          type: 'text', left: 'center', top: 'middle',
          style: { text: '暂无学习记录\n开始第一次复习后会自动生成', fill: muted, fontSize: 13, textAlign: 'center', lineHeight: 22 }
        }]
      });
      return;
    }
    var dates = hist.map(function (h) { return h.day.slice(5); });
    var vals = hist.map(function (h) { return Math.round(h.mastery * 100); });
    chart.setOption({
      animation: false,
      grid: { top: 30, right: 30, bottom: 40, left: 50 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#0f0e17', borderWidth: 0, textStyle: { color: '#fff', fontSize: 12 },
        appendToBody: true,
        formatter: function (p) { return p[0].name + '<br/>掌握度 ' + p[0].value + '%'; }
      },
      xAxis: {
        type: 'category', data: dates, boundaryGap: false,
        axisLine: { lineStyle: { color: rule } }, axisTick: { show: false },
        axisLabel: { color: muted, fontSize: 11, fontFamily: 'JetMono' }
      },
      yAxis: {
        type: 'value', min: 0, max: 100,
        splitLine: { lineStyle: { color: rule } },
        axisLabel: { color: muted, fontSize: 11, formatter: '{value}%' }
      },
      series: [{
        type: 'line', data: vals, smooth: true, symbol: 'circle', symbolSize: 6,
        lineStyle: { color: accent, width: 3 },
        itemStyle: { color: accent, borderColor: '#fff', borderWidth: 2 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: accent + '55' },
              { offset: 1, color: accent + '00' }
            ]
          }
        }
      }]
    });
  }
  function generateSeedHistory() { return []; } // 无数据时显示空数组
  window.addEventListener('resize', function () { if (chart) chart.resize(); });

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); }

  /* ---------- Init ---------- */
  // 1) 数据兜底:保证至少有一个卡组
  if (!state.decks || state.decks.length === 0) {
    state.decks = [{ id: 'default', name: '🎒 学习卡组', cards: [] }];
    saveState();
  }
  // 2) 第一次先同步默认 tab → 把对应 panel 从 display:none 解封
  syncActivePanel();
  // 3) 渲染左侧卡组列表 + 让 4 个 select 都有选项
  renderDecks();
  refreshDeckSelect();
  // 4) 准备复习队列 + 立刻显示
  buildQueue();
  showNext();
  // 5) 顶部统计 + 曲线
  updateStats();
  updateProgress();
  renderChart();
  // 6) 词库面板内容
  renderIelts();
  fillUnitPick('3上');
  renderGrade();
  fillMiddleUnitPick('7上');
  renderMiddle();
  fillOldMiddleUnitPick('7上');
  renderOldMiddle();
  fillHighSchoolUnitPick('高一必修1');
  renderHighSchool();

  /* 早安续接:如果今天首次打开 + 昨天有学习 → 提示昨天的卡今天先复习 */
  (function resumeYesterday() {
    var today = todayKey();
    var todayN = (state.dailyLog && state.dailyLog[today]) || 0;
    if (todayN > 0) return;            // 已经开始学 → 不打扰
    var y = new Date(); y.setDate(y.getDate() - 1);
    var yKey = y.toISOString().slice(0, 10);
    var yN = (state.dailyLog && state.dailyLog[yKey]) || 0;
    if (yN === 0) return;              // 昨天也没学
    // 数一下现在队列里有多少卡(实际上已经会含过期的)
    var queueLen = studyQueue.length;
    if (queueLen > 0) {
      setTimeout(function () {
        showToast('🌅 早安 · 你昨天学了 ' + yN + ' 个 · 今天还有 ' + queueLen + ' 张要续(已自动排到最前)', 'info');
      }, 800);
    }
  })();

  /* 雅思词库搜索 + 分类筛选 + 加入状态筛选 */
  var ieltsSearch = document.getElementById('ieltsSearch');
  if (ieltsSearch) {
    ieltsSearch.addEventListener('input', function () { renderIelts(ieltsSearch.value.trim().toLowerCase()); });
  }
  var ieltsTagSel = document.getElementById('ieltsTag');
  if (ieltsTagSel) {
    ieltsTagSel.addEventListener('change', function () { renderIelts(document.getElementById('ieltsSearch').value.trim().toLowerCase()); });
  }
  var ieltsFilterSel = document.getElementById('ieltsFilter');
  if (ieltsFilterSel) {
    ieltsFilterSel.addEventListener('change', function () { renderIelts(document.getElementById('ieltsSearch').value.trim().toLowerCase()); });
  }

  /* 每日推荐 20 词 */
  document.getElementById('ieltsDaily').addEventListener('click', function () {
    var deckId = document.getElementById('ieltsDeck').value;
    var deck = state.decks.find(function (d) { return d.id === deckId; });
    if (!deck) { showToast('请先选择一个卡组', 'warn'); return; }
    // 用日期做种子
    var today = new Date(); var seed = today.getFullYear() * 10000 + (today.getMonth()+1) * 100 + today.getDate();
    function seededRandom(s) { var x = Math.sin(s) * 10000; return x - Math.floor(x); }
    // 收集未加入的词
    var candidates = [];
    IELTS_VOCAB.forEach(function(pair) {
      if (!deck.cards.some(function(c) { return c.front.toLowerCase() === pair[0].toLowerCase(); })) {
        candidates.push(pair);
      }
    });
    // Fisher-Yates 洗牌
    for (var i = candidates.length - 1; i > 0; i--) {
      seed++; var j = Math.floor(seededRandom(seed) * (i + 1));
      var tmp = candidates[i]; candidates[i] = candidates[j]; candidates[j] = tmp;
    }
    var batch = candidates.slice(0, 20);
    var added = 0;
    batch.forEach(function(pair) {
      deck.cards.push({ id: nid(), front: pair[0], back: pair[1], ef: 2.5, rep: 0, interval: 0, due: now(), added: now(), lastReview: null, skip: false, _src: 'vocab' });
      added++;
    });
    saveState(); renderDecks(); updateStats(); renderIelts();
    activeDeckId = deck.id; renderDecks(); refreshStudy();
    showToast('今日推荐 ' + added + ' 词已加入「' + deck.name + '」', 'success');
  });

  /* "今日已学"统计 + 顶栏小标 */
  function calcTodayStats() {
    var today = todayKey();
    var cardsToday = (state.dailyLog && state.dailyLog[today]) || 0;
    var lastStudy = null;
    (state.history || []).forEach(function (h) {
      if (!lastStudy || h.day > lastStudy.day) lastStudy = h;
    });
    return { cardsToday: cardsToday, minsToday: cardsToday, lastStudy: lastStudy };
  }
  function updateTopStats() {
    var stats = calcTodayStats();
    var nav = document.querySelector('.nav .brand');
    if (!nav) return;
    var tag = nav.querySelector('.last-study-tag');
    if (!tag) {
      tag = document.createElement('span');
      tag.className = 'last-study-tag';
      tag.style.cssText = 'font-size:11px;font-weight:500;color:var(--muted);margin-left:4px;';
      nav.appendChild(tag);
    }
    var today = todayKey();
    var todayN = (state.dailyLog && state.dailyLog[today]) || 0;
    var y = new Date(); y.setDate(y.getDate() - 1);
    var yKey = y.toISOString().slice(0, 10);
    var yN = (state.dailyLog && state.dailyLog[yKey]) || 0;
    if (todayN === 0) {
      tag.textContent = yN > 0 ? '· 昨天学了 ' + yN + ' 个,今天还没开始' : '· 今天还没开始';
    } else {
      tag.textContent = yN > 0 ? '· 今天 ' + todayN + ' · 昨天 ' + yN : '· 今天已学 ' + todayN + ' 个';
    }
  }
  updateTopStats();
  // 每次 history 变化后刷新
  var _renderChart_orig = renderChart;
  renderChart = function () { _renderChart_orig(); updateTopStats(); };

  /* 重置当前卡组进度 */
  document.getElementById('resetBtn').addEventListener('click', async function () {
    if (!activeDeckId) return;
    var d = state.decks.find(function (x) { return x.id === activeDeckId; });
    if (!d) return;
    var ok = await RBModal.confirmAsync({
      title: '确定要重置「' + d.name + '」所有卡片的复习进度吗?',
      desc: '所有间隔 / 难度评分会被清空,卡组回到未学习状态。',
      confirmText: '重置',
      danger: true
    });
    if (!ok) return;
    d.cards.forEach(function (c) {
      c.rep = 0; c.interval = 0; c.ef = 2.5; c.due = 0; c.lastReview = 0;
    });
    saveState();
    buildQueue(); showNext(); renderDecks(); refreshDeckSelect(); renderChart(); updateProgress();
    showToast('✓ 已重置「' + d.name + '」进度');
  });

  /* 清除全部词库卡片 */
  var clearAllBtn = document.getElementById('clearAllBtn');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', async function () {
      var ok = await RBModal.confirmAsync({
        title: '确定要清除全部词库导入的卡片吗?',
        desc: '这会删除所有从词库(雅思/小学/初中/高中)导入的卡片,自定义卡片不受影响。',
        confirmText: '清除',
        danger: true
      });
      if (!ok) return;
      var removed = 0;
      state.decks.forEach(function (deck) {
        var before = deck.cards.length;
        deck.cards = deck.cards.filter(function (c) {
          return !c._src || ['ielts','grade','middle','oldMiddle','highSchool'].indexOf(c._src) === -1;
        });
        removed += before - deck.cards.length;
      });
      saveState();
      buildQueue(); showNext(); renderDecks(); refreshDeckSelect(); renderChart(); updateProgress();
      showToast('✓ 已清除 ' + removed + ' 张词库卡片');
    });
  }

  /* 全局错误兜底 */
  var errToast = document.getElementById('errToast');
  function showError(msg) {
    if (!errToast) return;
    errToast.textContent = '⚠ ' + msg;
    errToast.classList.add('show');
    setTimeout(function () { errToast.classList.remove('show'); }, 4500);
  }
  window.addEventListener('error', function (e) {
    console.error('Recalleum:', e.error || e.message);
    showError('遇到了一点问题,请刷新页面重试');
  });
  window.addEventListener('unhandledrejection', function (e) {
    console.error('Recalleum promise:', e.reason);
    showError('后台操作失败');
  });
})();
