import keymage from "keymage";
import { io } from "socket.io-client";
import whiteboard from "./whiteboard.js";
import keybinds from "./keybinds.js";
import Picker from "vanilla-picker";
import { dom } from "@fortawesome/fontawesome-svg-core";
import shortcutFunctions from "./shortcutFunctions.js";
import ReadOnlyService from "./services/ReadOnlyService.js";
import InfoService from "./services/InfoService.js";
import { getSubDir } from "./utils.js";
import ConfigService from "./services/ConfigService.js";
import { v4 as uuidv4 } from "uuid";

import * as pdfjsLib from 'pdfjs-dist/webpack.mjs';

const urlParams = new URLSearchParams(window.location.search);
let whiteboardId = urlParams.get("whiteboardid");
const randomid = urlParams.get("randomid");

if (randomid) {
    whiteboardId = uuidv4();
    urlParams.delete("randomid");
    window.location.search = urlParams;
}

if (!whiteboardId) {
    whiteboardId = "myNewWhiteboard";
}

whiteboardId = unescape(encodeURIComponent(whiteboardId)).replace(/[^a-zA-Z0-9\-]/g, "");

if (urlParams.get("whiteboardid") !== whiteboardId) {
    urlParams.set("whiteboardid", whiteboardId);
    window.location.search = urlParams;
}

const myUsername = urlParams.get("username") || "unknown" + (Math.random() + "").substring(2, 6);
const accessToken = urlParams.get("accesstoken") || "";
const copyfromwid = urlParams.get("copyfromwid") || "";

// Custom Html Title
const title = urlParams.get("title");
if (title) {
    document.title = decodeURIComponent(title);
}

const subdir = getSubDir();
let signaling_socket;

// Define color picker template and functions first
const colorPickerTemplate = `
<div class="picker_wrapper" tabindex="-1">
  <div class="picker_arrow"></div>
  <div class="picker_hue picker_slider">
    <div class="picker_selector"></div>
  </div>
  <div class="picker_sl">
    <div class="picker_selector"></div>
  </div>
  <div class="picker_alpha picker_slider">
    <div class="picker_selector"></div>
  </div>
  <div class="picker_palette"></div>
  <div class="picker_editor">
    <input aria-label="Type a color name or hex value"/>
  </div>
  <div class="picker_sample"></div>
  <div class="picker_done">
    <button>Ok</button>
  </div>
  <div class="picker_cancel">
    <button>Cancel</button>
  </div>
</div>
`;

let colorPicker = null;
let bgColorPicker = null;

const colorPickerOnOpen = function (current_color) {
    this._domPalette = $(".picker_palette", this.domElement);
    const palette = JSON.parse(localStorage.getItem("savedColors") || '["rgba(0, 0, 0, 1)"]');
    if ($(".picker_splotch", this._domPalette).length === 0) {
        for (let i = 0; i < palette.length; i++) {
            let palette_Color_obj = new this.color.constructor(palette[i]);
            let splotch_div = $(
                '<div style="position:relative;"><span position="' +
                i +
                '" class="removeColor" style="position:absolute; cursor:pointer; right:-1px; top:-4px;">x</span></div>'
            )
                .addClass("picker_splotch")
                .attr({
                    id: "s" + i,
                })
                .css("background-color", palette_Color_obj.hslaString)
                .on("click", { that: this, obj: palette_Color_obj }, function (e) {
                    e.data.that._setColor(e.data.obj.hslaString);
                });
            splotch_div.find(".removeColor").on("click", function (e) {
                e.preventDefault();
                $(this).parent("div").remove();
                palette.splice(i, 1);
                localStorage.setItem("savedColors", JSON.stringify(palette));
            });
            this._domPalette.append(splotch_div);
        }
    }
};

function initColorPicker(initColor) {
    if (colorPicker) {
        colorPicker.destroy();
    }
    colorPicker = new Picker({
        parent: $("#whiteboardColorpicker")[0],
        color: initColor || "#000000",
        onChange: function (color) {
            whiteboard.setDrawColor(color.rgbaString);
        },
        onDone: function (color) {
            let palette = JSON.parse(localStorage.getItem("savedColors") || '["rgba(0, 0, 0, 1)"]');
            if (!palette.includes(color.rgbaString)) {
                palette.push(color.rgbaString);
                localStorage.setItem("savedColors", JSON.stringify(palette));
            }
            initColorPicker(color.rgbaString);
        },
        onOpen: colorPickerOnOpen,
        template: colorPickerTemplate,
    });
}

function initBgColorPicker(initColor) {
    if (bgColorPicker) {
        bgColorPicker.destroy();
    }
    bgColorPicker = new Picker({
        parent: $("#textboxBackgroundColorPicker")[0],
        color: initColor || "#f5f587",
        bgcolor: initColor || "#f5f587",
        onChange: function (bgcolor) {
            whiteboard.setTextBackgroundColor(bgcolor.rgbaString);
        },
        onDone: function (bgcolor) {
            let palette = JSON.parse(localStorage.getItem("savedColors") || '["rgba(0, 0, 0, 1)"]');
            if (!palette.includes(bgcolor.rgbaString)) {
                palette.push(bgcolor.rgbaString);
                localStorage.setItem("savedColors", JSON.stringify(palette));
            }
            initBgColorPicker(bgcolor.rgbaString);
        },
        onOpen: colorPickerOnOpen,
        template: colorPickerTemplate,
    });
}

function main() {
    // First, show the body
    $("body").show();

    // Initialize basic whiteboard UI
    whiteboard.loadWhiteboard("#whiteboardContainer", {
        //Load the whiteboard
        whiteboardId: whiteboardId,
        username: btoa(encodeURIComponent(myUsername)),
        backgroundGridUrl: "./images/bg_grid.png",
        sendFunction: function (content) {
            if (signaling_socket && signaling_socket.connected) {
                content["at"] = accessToken;
                signaling_socket.emit("drawToWhiteboard", content);
                InfoService.incrementNbMessagesSent();
            }
        },
        readOnly: false
    });

    // Ensure read-write mode
    if (ReadOnlyService) {
        ReadOnlyService.deactivateReadOnlyMode();
    }

    // Initialize UI elements
    $(document).ready(function() {
        // Show toolbar
        $("#toolbar").show();
        
        // Initialize basic tools
        shortcutFunctions.setTool_mouse();
        whiteboard.refreshCursorAppearance();

        // Initialize color pickers
        initColorPicker();
        initBgColorPicker();

        // Show the container
        $("#whiteboardContainer").show();

        // switch tool
        $(".whiteboard-tool")
            .off("click")
            .click(function () {
                $(".whiteboard-tool").removeClass("active");
                $(this).addClass("active");
                var activeTool = $(this).attr("tool");
                whiteboard.setTool(activeTool);
                if (activeTool == "mouse" || activeTool == "recSelect") {
                    $(".activeToolIcon").empty();
                } else {
                    $(".activeToolIcon").html($(this).html()); //Set Active icon the same as the button icon
                }

                if (activeTool == "text" || activeTool == "stickynote") {
                    $("#textboxBackgroundColorPickerBtn").show();
                } else {
                    $("#textboxBackgroundColorPickerBtn").hide();
                }
            });

        // whiteboard clear button
        $("#whiteboardTrashBtn")
            .off("click")
            .click(function () {
                $("#whiteboardTrashBtnConfirm").show().focus();
                $(this).hide();
            });

        $("#whiteboardTrashBtnConfirm")
            .off("click")
            .click(function () {
                $(this).hide();
                $("#whiteboardTrashBtn").show();
                whiteboard.clearWhiteboard();
            });

        // undo button
        $("#whiteboardUndoBtn")
            .off("click")
            .click(function () {
                whiteboard.undoWhiteboardClick();
            });

        // redo button
        $("#whiteboardRedoBtn")
            .off("click")
            .click(function () {
                whiteboard.redoWhiteboardClick();
            });

        // view only
        $("#whiteboardLockBtn")
            .off("click")
            .click(() => {
                ReadOnlyService.deactivateReadOnlyMode();
            });
        $("#whiteboardUnlockBtn")
            .off("click")
            .click(() => {
                ReadOnlyService.activateReadOnlyMode();
            });
        $("#whiteboardUnlockBtn").hide();
        $("#whiteboardLockBtn").show();

        // Set initial tool to pen
        whiteboard.setTool("pen");
        $("[tool='pen']").addClass("active");
    });

    // Then attempt socket connection
    try {
        signaling_socket = io("", { 
            path: subdir + "/ws-api",
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 10000
        });

        signaling_socket.on("connect", function () {
            console.log("Websocket connected!");

            signaling_socket.emit("joinWhiteboard", {
                wid: whiteboardId,
                at: accessToken,
                windowWidthHeight: { w: $(window).width(), h: $(window).height() },
            });
        });

        signaling_socket.on("connect_error", function(error) {
            console.log("Socket connection error:", error);
            // Continue in offline mode
            whiteboard.refreshCursorAppearance();
        });

    } catch (error) {
        console.error("Failed to initialize socket connection:", error);
        // Continue in offline mode
        whiteboard.refreshCursorAppearance();
    }
}

// Initialize when document is ready
$(document).ready(() => {
    main();
});

export default main;
