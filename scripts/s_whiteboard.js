import fs from "fs";
import config from "./config/config.js";
import { getSafeFilePath } from "./utils.js";
import RedisService from "./services/RedisService.js";

const FILE_DATABASE_FOLDER = "savedBoards";

if (config.backend.enableFileDatabase) {
    fs.mkdirSync(FILE_DATABASE_FOLDER, {
        recursive: true,
    });
}

function fileDatabasePath(wid) {
    return getSafeFilePath(FILE_DATABASE_FOLDER, wid + ".json");
}

const s_whiteboard = {
    async handleEventsAndData(content) {
        const tool = content["t"];
        const wid = content["wid"];
        const username = content["username"];

        if (tool === "clear") {
            await RedisService.clearWhiteboard(wid);
            if (config.backend.enableFileDatabase) {
                fs.unlink(fileDatabasePath(wid), (err) => {
                    if (err) console.log(err);
                });
            }
        } else if (
            [
                "line",
                "pen",
                "rect",
                "circle",
                "eraser",
                "addImgBG",
                "recSelect",
                "eraseRec",
                "addTextBox",
                "setTextboxText",
                "removeTextbox",
                "setTextboxPosition",
                "setTextboxFontSize",
                "setTextboxFontColor",
            ].includes(tool)
        ) {
            delete content["wid"];
            await RedisService.addDrawingToWhiteboard(wid, content);
            await RedisService.publishDrawingUpdate(wid, content);
            this.saveToDB(wid);
        }
    },

    async saveToDB(wid) {
        if (config.backend.enableFileDatabase) {
            const data = await RedisService.getWhiteboardData(wid);
            if (data && data.length > 0) {
                fs.writeFile(fileDatabasePath(wid), JSON.stringify(data), (err) => {
                    if (err) console.log(err);
                });
            }
        }
    },

    async loadStoredData(wid) {
        let data = await RedisService.getWhiteboardData(wid);
        
        if (data.length === 0 && config.backend.enableFileDatabase) {
            const filePath = fileDatabasePath(wid);
            if (fs.existsSync(filePath)) {
                try {
                    const fileData = fs.readFileSync(filePath);
                    if (fileData) {
                        data = JSON.parse(fileData);
                        await RedisService.saveWhiteboardData(wid, data);
                    }
                } catch (err) {
                    console.error('Error loading data from file:', err);
                }
            }
        }
        
        return data;
    },

    async copyStoredData(sourceWid, targetWid) {
        const sourceData = await this.loadStoredData(sourceWid);
        const targetData = await RedisService.getWhiteboardData(targetWid);
        
        if (sourceData.length === 0 || targetData.length > 0) {
            return;
        }
        
        await RedisService.saveWhiteboardData(targetWid, sourceData);
        this.saveToDB(targetWid);
    },

    async saveData(wid, data) {
        const existingData = await RedisService.getWhiteboardData(wid);
        if (existingData.length > 0 || !data) {
            return;
        }
        
        const parsedData = JSON.parse(data);
        await RedisService.saveWhiteboardData(wid, parsedData);
        this.saveToDB(wid);
    },
};

export { s_whiteboard as default };