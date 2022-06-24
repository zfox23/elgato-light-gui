import { FlexLayout, QIcon, QLineEdit, QMainWindow, QPushButton, QSlider, QWidget } from "@nodegui/nodegui";
import { ElgatoKeylightAPI, KeyLight } from "elgato-light-api";
import path from "path";
import { temperatureLUT } from "./temperatureLUT";
import { clamp, getKeyByValue, roundNearest50 } from "./utils";

const win = new QMainWindow();
win.setWindowTitle("Elgato Light Controller");
const logoPath = path.resolve(__dirname, `../assets/elgato.jpg`);
const icon = new QIcon(logoPath);
win.setWindowIcon(icon);
win.setFixedSize(512, 512);

const updateWidgetsText = () => {
    temperatureK = getKeyByValue(temperatureLUT, lightSettings.temperature);
    temperatureSlider.setToolTip(`${temperatureK}K`);
    temperatureTextbox.setText(temperatureK || "uhoh");

    const lightBrightnessString = Math.round(lightSettings.brightness).toString();
    brightnessSlider.setToolTip(`${lightBrightnessString}%`);
    brightnessTextbox.setText(lightBrightnessString);
}
const updateSliderValues = () => {
    brightnessSlider.setValue(lightSettings.brightness);
    const k = getKeyByValue(temperatureLUT, lightSettings.temperature);
    temperatureSlider.setValue(parseInt(k ? k : "0"));
}

let updatePending = false;
let shouldRetry = false;
let retryTimeout: any = null;
const DEBOUNCE_MS = 500;
const updateLight = async () => {
    updateWidgetsText();
    if (updatePending) {
        shouldRetry = true;
    } else {
        updatePending = true;
        await lightAPI.updateAllLights({
            numberOfLights: 1,
            lights: [lightSettings]
        });

        if (retryTimeout) {
            clearTimeout(retryTimeout);
            retryTimeout = null;
        }
        retryTimeout = setTimeout(() => {
            retryTimeout = null;
            updatePending = false;
            if (shouldRetry) {
                shouldRetry = false;
                updateLight();
            }
        }, DEBOUNCE_MS);

        if (shouldRetry) {
            shouldRetry = false;
            updateLight();
        }
    }
}

const TEMPERATURE_MIN_K = 2900;
const TEMPERATURE_MAX_K = 7000;
const BRIGHTNESS_MIN = 3; // 3%
const BRIGHTNESS_MAX = 100; // 100%
let lightSettings = {
    on: 0,
    temperature: temperatureLUT[TEMPERATURE_MIN_K],
    brightness: BRIGHTNESS_MAX
};
let temperatureK;
const lightAPI = new ElgatoKeylightAPI();
lightAPI.on('newKeyLight', (newLight: KeyLight) => {
    console.log(`Found a new Key Light Air!`);
    if (!(newLight.options && newLight.options.lights && newLight.options.lights[0])) {
        return;
    }
    
    lightSettings = newLight.options.lights[0];
    updateWidgetsText();
    updateSliderValues();
});

const mainWidget = new QWidget();
mainWidget.setInlineStyle(`width: 512; height: 512; align-items: 'center'; justify-content: 'center'; background-color: #f7f7f7; flex-direction: 'row'; gap: 48;`);
const rootLayout = new FlexLayout();
mainWidget.setLayout(rootLayout);

const onOffWidget = new QWidget();
onOffWidget.setInlineStyle(`flex-direction: 'col'; gap: 8;`);
const onOffLayout = new FlexLayout();
onOffWidget.setLayout(onOffLayout);
const onButton = new QPushButton();
onButton.setText('On');
onButton.addEventListener('clicked', async () => {
    lightSettings.on = 1;
    await updateLight();
});
onOffLayout.addWidget(onButton);

const offButton = new QPushButton();
offButton.setText('Off');
offButton.addEventListener('clicked', async () => {
    lightSettings.on = 0;
    await updateLight();
});
onOffLayout.addWidget(offButton);
rootLayout.addWidget(onOffWidget);

const temperatureWidget = new QWidget();
temperatureWidget.setInlineStyle(`flex-direction: 'col'; align-items: 'center';`);
const temperatureLayout = new FlexLayout();
temperatureWidget.setLayout(temperatureLayout);
const temperatureSlider = new QSlider();
temperatureSlider.setMinimum(TEMPERATURE_MIN_K);
temperatureSlider.setMaximum(TEMPERATURE_MAX_K);
temperatureSlider.addEventListener('valueChanged', async (newTemp) => {
    newTemp = roundNearest50(newTemp);
    lightSettings.temperature = temperatureLUT[newTemp];
    lightSettings.on = 1;
    await updateLight();
})
const temperatureTextbox = new QLineEdit();
temperatureTextbox.addEventListener('returnPressed', async () => {
    let newTemp = parseInt(temperatureTextbox.text());
    if (isNaN(newTemp)) {
        updateWidgetsText();
        return;
    }
    newTemp = roundNearest50(newTemp);
    lightSettings.temperature = temperatureLUT[newTemp];
    lightSettings.on = 1;
    updateSliderValues();
    await updateLight();
})
temperatureLayout.addWidget(temperatureSlider);
temperatureLayout.addWidget(temperatureTextbox);
rootLayout.addWidget(temperatureWidget);

const brightnessWidget = new QWidget();
brightnessWidget.setInlineStyle(`flex-direction: 'col'; align-items: 'center';`);
const brightnessLayout = new FlexLayout();
brightnessWidget.setLayout(brightnessLayout);
const brightnessSlider = new QSlider();
brightnessSlider.setMinimum(BRIGHTNESS_MIN);
brightnessSlider.setMaximum(BRIGHTNESS_MAX);
brightnessSlider.addEventListener('valueChanged', async (value) => {
    lightSettings.brightness = value;
    lightSettings.on = 1;
    await updateLight();
})
const brightnessTextbox = new QLineEdit();
brightnessTextbox.addEventListener('returnPressed', async () => {
    let newBrightness = parseInt(brightnessTextbox.text());
    if (isNaN(newBrightness)) {
        updateWidgetsText();
        return;
    }

    lightSettings.brightness = clamp(newBrightness, BRIGHTNESS_MIN, BRIGHTNESS_MAX);
    lightSettings.on = 1;
    updateSliderValues();
    await updateLight();
})
brightnessLayout.addWidget(brightnessSlider);
brightnessLayout.addWidget(brightnessTextbox);
rootLayout.addWidget(brightnessWidget);

updateWidgetsText();

win.setCentralWidget(mainWidget);
win.show();

(global as any).win = win;
