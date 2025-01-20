// 自动读取LRC文件生成字幕并允许用户选择的脚本

// 创建窗口
var win = new Window("palette", "LRC 字幕生成器", [100, 100, 500, 600]);

// 创建文件选择按钮
var fileButton = win.add("button", [10, 10, 150, 40], "选择LRC文件");
var lrcFilePath = "";

// 创建一个列表框显示字幕条目
var listBox = win.add("listbox", [10, 50, 460, 300], [], {multiselect: true});
listBox.preferredSize = [460, 200];

// 创建确认按钮
var confirmButton = win.add("button", [10, 320, 150, 350], "生成字幕");

// 创建字体选择控件
var fontGroup = win.add("group", undefined, "字体设置");
fontGroup.add("statictext", undefined, "字体:");

var fontFamilyDropdown = fontGroup.add("dropdownlist", undefined, []);
var fontStyleDropdown = fontGroup.add("dropdownlist", undefined, []);
fontFamilyDropdown.preferredSize = [150, 20];
fontStyleDropdown.preferredSize = [150, 20];

// 获取可用字体家族和样式
var fontFamilies = [];
var fontStyles = [];
// 获取所有可用字体
for (var i = 0; i < app.fonts.allFonts.length; i++) {
    fontFamilyDropdown.add("item", app.fonts.allFonts[i][0].familyName);// 添加字体家族名称
    win.layout.layout(true);
}


// 更新样式下拉框，当选择字体家族时
fontFamilyDropdown.onChange = function() {
    fontStyleDropdown.removeAll(); // 清空样式下拉框
    var selectedFamily = fontFamilyDropdown.selection.text;

    // 获取选择的字体家族的所有样式
    var selectedStyles = [];
    for (var i = 0; i < app.fonts.allFonts.length; i++) {
        if (app.fonts.allFonts[i][0].familyName === selectedFamily) {
            for (var j = 0; j < app.fonts.allFonts[i].length; j++) {
                fontStyleDropdown.add("item", app.fonts.allFonts[i][j].styleName);// 添加字体家族名称
                win.layout.layout(true);
            }
            break;
        }
    }

    fontStyleDropdown.add("item", selectedStyles); // 添加样式到下拉框
};

// 默认选择第一个字体家族
if (fontFamilyDropdown.items.length > 0) {
    fontFamilyDropdown.selection = fontFamilyDropdown.items[0];
};

fontGroup.add("statictext", undefined, "大小:");
var fontSizeInput = fontGroup.add("edittext", undefined, "50");
fontSizeInput.characters = 5;

fontGroup.add("statictext", undefined, "颜色(十六进制):");
var colorInput = fontGroup.add("edittext", undefined, "#FFFFFF");
colorInput.characters = 10;

// 创建调试信息文本框
var debugText = win.add("statictext", [10, 370, 460, 460], "等待操作...");
win.layout.layout(true); // 刷新窗口

// 选择文件按钮的事件
fileButton.onClick = function () {
    var file = File.openDialog("选择LRC文件", "*.lrc");
    if (file) {
        lrcFilePath = file.fsName;
        loadLrcFile(lrcFilePath);
    }
};

// 加载LRC文件并解析
function loadLrcFile(filePath) {
    var file = new File(filePath);
    if (file.open("r")) {
        var lrcData = file.read(); // 读取LRC文件内容
        file.close();
        
        debugText.text += "LRC文件加载成功：" + filePath + "\n"; // 输出加载成功的调试信息
        win.layout.layout(true); // 强制刷新窗口布局

        var lines = lrcData.split("\n");
        listBox.removeAll(); // 清空列表框
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var timestampMatch = line.match(/\[\d{2}:\d{2}\.\d{1,3}\]/);
            if (timestampMatch) {
                listBox.add("item", line); // 添加字幕文本到列表框
            }
        }
        debugText.text = "LRC文件解析完成，准备生成字幕"; // 更新状态
        
        win.layout.layout(true); // 刷新窗口
    } else {
        debugText.text = "无法打开LRC文件，请检查文件路径！"; // 如果无法打开文件，显示错误信息
        win.layout.layout(true); // 刷新窗口
        alert("无法打开LRC文件，请检查文件路径！");
    }
}

// 生成字幕按钮的事件
confirmButton.onClick = function () {
    var comp = app.project.activeItem;
    if (comp && comp instanceof CompItem) {
        app.beginUndoGroup("Generate Subtitles");

        var selectedItems = listBox.selection; // 获取选择的字幕项
        if (selectedItems.length === 0) {
            debugText.text = "请先选择至少一个字幕条目！"; // 如果没有选择字幕，输出提示
            win.layout.layout(true); // 刷新窗口
            return;
        }

        // 获取用户选择的字体、大小和颜色
        var fontList = app.fonts.getFontsByFamilyNameAndStyleName(fontFamilyDropdown.selection.text, fontStyleDropdown.selection.text)
        var selectedFontFamily = fontFamilyDropdown.selection.text;
        var selectedFontStyle = fontStyleDropdown.selection.text;
        var fontSize = parseInt(fontSizeInput.text);

        // 确保没有额外的空格
        selectedFontFamily = selectedFontFamily.replace(/\s+/g, ''); // 去除多余的空格
        selectedFontStyle = selectedFontStyle.replace(/\s+/g, ''); // 去除多余的空格

        // 解析用户输入的十六进制颜色
        var hexColor = colorInput.text;
        if (!/^#[0-9A-Fa-f]{6}$/.test(hexColor)) {
            debugText.text = "请输入有效的十六进制颜色代码！";
            win.layout.layout(true); // 刷新窗口
            return;
        }

        var r = parseInt(hexColor.substring(1, 3), 16) / 255;
        var g = parseInt(hexColor.substring(3, 5), 16) / 255;
        var b = parseInt(hexColor.substring(5, 7), 16) / 255;
        var selectedColor = [r, g, b]; // 将十六进制颜色转换为RGB格式
        debugText.text = "正在生成字幕..."; // 输出生成字幕的调试信息
        win.layout.layout(true); // 刷新窗口

        // 创建一个文本层来存放所有字幕
        var textLayer = comp.layers.addText("");
        textLayer.startTime = 0;
        textLayer.inPoint = 0;
        textLayer.outPoint = comp.duration;

        // 获取文本层的文本属性
        var textProp = textLayer.property("Source Text");
        var textDocument = textProp.value;
        textDocument.font = fontList[0];
        textDocument.fontSize = fontSize; // 设置用户选择的字体大小
        textDocument.fillColor = selectedColor; // 设置用户输入的颜色
        textProp.setValue(textDocument);
        textProp.setValueAtTime(0, "")
        // 合并所有字幕到一个文本层
        var subtitleText = "";
        for (var i = 0; i < selectedItems.length; i++) {
            var text = selectedItems[i].text;
            var timestampMatch = text.match(/\[(\d{2}):(\d{2}\.\d{1,3})\]/);
            var minutes = parseInt(timestampMatch[1]);
            var seconds = parseFloat(timestampMatch[2]);
            var startTime = minutes * 60 + seconds; // 计算开始时间

            // 合并字幕文本
            var singleTextDoc = textDocument;
            singleTextDoc.text = text.replace(/\[\d{2}:\d{2}\.\d{1,3}\]/, '');
            // 设置字幕的显示时间，添加关键帧
            textProp.setValueAtTime(startTime, singleTextDoc); // 在特定时间显示字幕
            
            if (i + 1 < selectedItems.length) {
                var text = selectedItems[i + 1].text;
                var timestampMatchEnd = text.match(/\[(\d{2}):(\d{2}\.\d{1,3})\]/);
                var minutes = parseInt(timestampMatchEnd[1]);
                var seconds = parseFloat(timestampMatchEnd[2]);
                var endTime = minutes * 60 + seconds; // 计算开始时间
                textProp.setValueAtTime(endTime, ""); 
            }
            else {
                textProp.setValueAtTime(startTime + 2, "");  // 3秒后字幕消失
            }
            
        }

        // 设置最终字幕文本内容
        textDocument.text = subtitleText;

        app.endUndoGroup();

        debugText.text = "字幕生成完毕！"; // 输出生成完毕的信息
        win.layout.layout(true); // 刷新窗口
    } else {
        debugText.text = "请先打开一个合成！"; // 如果没有合成，输出错误信息
        win.layout.layout(true); // 刷新窗口
        alert("请先打开一个合成！");
    }
};

// 显示窗口
win.center();
win.show();
