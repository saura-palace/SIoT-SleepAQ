// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-blue; icon-glyph: cloud;
// THINGSPEAK
// https://thingspeak.com/

// Get widget parameters - using the ThingSpeak channel id|field number|desired results
let widgetInputRAW = args.widgetParameter || "3175717|2|results=5";

try {
    widgetInputRAW.toString();
} catch (e) {
    throw new Error("Please long press the widget and add a parameter. Eg: 12397|4|results=720");
}

var widgetInput = widgetInputRAW.toString();

// Parse the parameters
var inputArr = widgetInput.split("|");

// The size of the widget preview in the app - "small", "medium" or "large"
const widgetPreview = "small";

// Widget Settings
const thingSpeakSettings = {
    channelId: inputArr[0],
    fieldId: inputArr[1],
    queryParams: inputArr[2],
    showCreated: true,
};

// Configuration AQI threshold values and corresponding AQI colours
const variableConfigurations = {
    "PM1": [
        { threshold: 10, color: "#80ff00" },   // Light Green for values 0-10
        { threshold: 20, color: "#ffff00" },  // Orange for values 10-20
        { threshold: 30, color: "#ff8000" },  // Yellow for values 20-30
        { threshold: 40, color: "#ff0000" },  // Red for values 30-40
        { threshold: Infinity, color: "#0080ff" }  // Blue for values above 30
    ],
    "PM2.5": [
        { threshold: 10, color: "#80ff00" },   // Light Green for values 0-10
        { threshold: 20, color: "#ffff00" },  // Orange for values 10-20
        { threshold: 30, color: "#ff8000" },  // Yellow for values 20-30
        { threshold: 40, color: "#ff0000" },  // Red for values 30-40
        { threshold: Infinity, color: "#0080ff" }  // Blue for values above 30
    ],
    "PM4": [
        { threshold: 10, color: "#80ff00" },   // Light Green for values 0-10
        { threshold: 20, color: "#ffff00" },  // Orange for values 10-20
        { threshold: 30, color: "#ff8000" },  // Yellow for values 20-30
        { threshold: 40, color: "#ff0000" },  // Red for values 30-40
        { threshold: Infinity, color: "#0080ff" }  // Blue for values above 30
    ],
    "PM10": [
        { threshold: 10, color: "#80ff00" },   // Light Green for values 0-10
        { threshold: 20, color: "#ffff00" },  // Orange for values 10-20
        { threshold: 30, color: "#ff8000" },  // Yellow for values 20-30
        { threshold: 40, color: "#ff0000" },  // Red for values 30-40
        { threshold: Infinity, color: "#0080ff" }  // Blue for values above 30
    ],
    "NOx": [
        { threshold: 20, color: "#ff0000" },  // Red for values below 20
        { threshold: 40, color: "#ff8000" },  // Orange for values 20-40
        { threshold: 60, color: "#ffff00" },  // Yellow for values 40-60
        { threshold: 80, color: "#80ff00" },  // Light Green for values 60-80
        { threshold: Infinity, color: "#0080ff" }  // Blue for values above 80
    ],
    "VOCs": [
        { threshold: 20, color: "#ff0000" },  // Red for values below 20
        { threshold: 40, color: "#ff8000" },  // Orange for values 20-40
        { threshold: 60, color: "#ffff00" },  // Yellow for values 40-60
        { threshold: 120, color: "#80ff00" },  // Light Green for values 60-80
        { threshold: Infinity, color: "#0080ff" }  // Blue for values above 80
    ],
    "Humidity": [
        { threshold: 10, color: "#0080ff" },   // blue for values 0-10
        { threshold: 20, color: "#ff0000" },  // Red for values 10-20
        { threshold: 30, color: "#ff8000" },  // Orange for values 20-30
        { threshold: 50, color: "#80ff00" },  // green for values 30-50
        { threshold: 60, color: "#ff8000" },   // orange for values 50-60
        { threshold: 70, color: "#ff0000" },  // Red for values 60-70
        { threshold: Infinity, color: "#0080ff" }  // Blue for values above 70
    ],
    "Temperature": [
        { threshold: 20, color: "#80ff00" },   // Light Green for values 0-10
        { threshold: 30, color: "#ffff00" },  // Orange for values 10-20
        { threshold: 40, color: "#ff8000" },  // Yellow for values 20-30
        { threshold: 50, color: "#ff0000" },  // Red for values 30-40
        { threshold: Infinity, color: "#0080ff" }  // Blue for values above 30
    ],
    // Add configurations for other variables as needed
};

// Function to determine chart color based on variable and value
function determineChartColor(variableName, value) {
    const config = variableConfigurations[variableName];
    if (config) {
        for (let i = 0; i < config.length; i++) {
            if (value < config[i].threshold) {
                return new Color(config[i].color);
            }
        }
    }
    return new Color("#c88e69"); // Default color if no configuration found
}

// LineChart by https://kevinkub.de/
// Used as the widget background
class LineChart {
    constructor(width, height, values) {
        this.ctx = new DrawContext();
        this.ctx.size = new Size(width, height);
        this.values = values;
    }

    _calculatePath() {
        let maxValue = Math.max(...this.values);
        let minValue = Math.min(...this.values);
        let difference = maxValue - minValue;
        let count = this.values.length;
        let step = this.ctx.size.width / (count - 1);
        let points = this.values.map((current, index, all) => {
            let x = step * index;
            let y = this.ctx.size.height - (current - minValue) / difference * (this.ctx.size.height * 0.5);
            return new Point(x, y);
        });
        return this._getSmoothPath(points);
    }

    _getSmoothPath(points) {
        let path = new Path();
        path.move(new Point(0, this.ctx.size.height));
        path.addLine(points[0]);
        for (let i = 0; i < points.length - 1; i++) {
            let xAvg = (points[i].x + points[i + 1].x) / 2;
            let yAvg = (points[i].y + points[i + 1].y) / 2;
            let avg = new Point(xAvg, yAvg);
            let cp1 = new Point((xAvg + points[i].x) / 2, points[i].y);
            let next = new Point(points[i + 1].x, points[i + 1].y);
            let cp2 = new Point((xAvg + points[i + 1].x) / 2, points[i + 1].y);
            path.addQuadCurve(avg, cp1);
            path.addQuadCurve(next, cp2);
        }
        path.addLine(new Point(this.ctx.size.width, this.ctx.size.height));
        path.closeSubpath();
        return path;
    }

    configure(fn) {
        let path = this._calculatePath();
        if (fn) {
            fn(this.ctx, path);
        } else {
            this.ctx.addPath(path);
            this.ctx.fillPath(path);
        }
        return this.ctx;
    }
}

async function run() {
    let widget = new ListWidget();
    widget.setPadding(15, 15, 15, 15);
    widget.backgroundColor = new Color("#fff7f2");

    const channel = thingSpeakSettings.channelId;
    const field = thingSpeakSettings.fieldId;
    const query = thingSpeakSettings.queryParams;

    widget.url = "https://thingspeak.com/channels/" + channel;

    const thingSpeakJson = await getThingSpeakData(channel, field, query);
    const thingSpeakData = thingSpeakJson.feeds;
    const channelName = thingSpeakJson.channel.name;
    const fieldName = thingSpeakJson.channel["field" + field];

    let chartData = getCountsFromData(thingSpeakData, field);

    console.log("thingSpeakData:", thingSpeakData);
    console.log("chartData:", chartData);

    let width = 1200;
    let height = 1200;
    if (widgetPreview === "medium") {
        height = 600;
    }

    // Get the most recent value
    const recentIndex = chartData.length - 1;
    const recentValue = chartData[recentIndex];

    console.log("recentValue:", recentValue);

    // Determine variable name (for this example, assume it's Temperature or Humidity)
    // You should replace this logic with the appropriate way to determine the variable name
    const variableName = fieldName; // Use fieldName directly or map field ID to variable name

    // Determine chart color based on the most recent value and variable
    const chartColor = determineChartColor(variableName, recentValue);

    // Line chart as bg
    let chart = new LineChart(width, height, chartData).configure((ctx, path) => {
        ctx.opaque = false;
        ctx.setFillColor(chartColor);
        ctx.addPath(path);
        ctx.fillPath(path);
    }).getImage();
    widget.backgroundImage = chart;

    const textColor = Color.black();

    const header = widget.addText(channelName.toUpperCase());
    header.textColor = textColor;
    header.font = Font.regularSystemFont(12);
    header.minimumScaleFactor = 0.50;

    widget.addSpacer(5);

    const subheader = widget.addText(fieldName);
    subheader.textColor = textColor;
    subheader.font = Font.regularSystemFont(12);
    subheader.minimumScaleFactor = 0.50;

    if (recentValue !== undefined) {
        const valuetext = widget.addText(recentValue.toLocaleString(undefined, {
            maximumFractionDigits: 2,
            minimumFractionDigits: 0
        }));
        valuetext.textColor = textColor;
        valuetext.font = Font.semiboldSystemFont(30);
        valuetext.minimumScaleFactor = 0.3;
    } else {
        const valuetext = widget.addText("No data");
        valuetext.textColor = textColor;
        valuetext.font = Font.semiboldSystemFont(30);
        valuetext.minimumScaleFactor = 0.3;
    }

    widget.addSpacer(5);

    if (thingSpeakSettings.showCreated) {
        const createdAt = new Date(thingSpeakData[recentIndex].created_at).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
        });
        const widgetText = widget.addText(`At ${createdAt}`);
        widgetText.textColor = textColor;
        widgetText.font = Font.regularSystemFont(9);
        widgetText.minimumScaleFactor = 0.6;
    }

    widget.addSpacer();

    let refreshDate = new Date();
    refreshDate.setMinutes(refreshDate.getMinutes() + 5);
    widget.refreshAfterDate = refreshDate;

    Script.setWidget(widget);
    if (config.runsInApp) {
        if (widgetPreview === "small") { widget.presentSmall(); }
        else if (widgetPreview === "medium") { widget.presentMedium(); }
        else if (widgetPreview === "large") { widget.presentLarge(); }
    }
    Script.complete();
}

/**
 * Fetch ThingSpeak data
 * 
 * @param {string} channel
 * @param {string} field
 * @param {string} query parameter
 * @returns {Promise<ThingSpeakJson>}
 */
async function getThingSpeakData(channel, field, query) {
    let url = `https://api.thingspeak.com/channels/${channel}/fields/${field}.json?${query}`;
    let request = new Request(url);
    let response = await request.loadJSON();
    return response;
}

/**
 * Get counts from ThingSpeak data
 * 
 * @param {Array} thingSpeakData
 * @param {string} field
 * @returns {Array<Number>}
 */
function getCountsFromData(thingSpeakData, field) {
    return thingSpeakData.map(entry => parseFloat(entry[`field${field}`])).filter(entry => !isNaN(entry));
}

await run();
