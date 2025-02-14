### Template for airquality sensor

To setup your Air Quality Sensor, you need to have a file structure in your SD card that follows the following structure:

```
root
|-- config
|   |-- wifi_credentials.txt
|-- webinterface
|   |-- index.html
|   |-- [other supporting files for the web interface]
```

You can generate the wifi_credential.txt file at [this address](https://www.studioluff.com/setup/), and you can download the template files [here](https://github.com/VentyCZ/airqualitysensor_webinterface/releases/latest/download/webinterface.zip).


To personalize the web interface of your Air Quality Sensor you can clone this repo, modify it to your liking and build it by running
```bash
./bundle.js
```
This will generate files inside build/webinterface, ready to be copied to your SD card! (keep the folder structure, as described above, in mind)
