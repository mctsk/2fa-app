const fs = require('fs')
const os = require('os')
const { TOTP } = require('totp-generator')
const Sortable = require('sortablejs')
const storage = require('electron-json-storage');

storage.setDataPath(os.homedir());

const dataPath = storage.getDataPath();
const path = require('path')


const filePath = path.join(__dirname, 'data.json')
let allData = {}

var remainSeconds = 0;
var deleteModal;
var addModal;
var sortable;
var snackbar;
var countdownNumberEl;
var editActive = false;
var longPressTimer = null;
var longPressDelay = 1000; // 2 seconds

document.addEventListener('DOMContentLoaded', function () {
    // Initialize MDC Dialogs and Snackbar
    deleteModal = new mdc.dialog.MDCDialog(document.getElementById('deleteModal'))
    addModal = new mdc.dialog.MDCDialog(document.getElementById('addNewModal'))
    snackbar = new mdc.snackbar.MDCSnackbar(document.getElementById('snackbar'))
   
    var el = document.getElementById('sortable');
    var options = {
        group: 'share',
        animation: 100
    };

    events = [
        'onEnd',
    ].forEach(function (name) {
        options[name] = function (evt) {

            var itemList = document.querySelectorAll(".row-2fa")

            var queueList = [];
            itemList.forEach((x, i) => {
                queueList.push(x.getAttribute("dataid")
                )
            })

            queueList.forEach((item, i) => {
                var entry = allData.entries.find(x => { return x.id == item });
                entry.queue = i;
            });

            // writeData();
            setStorage()
        };
    });

    sortable = Sortable.create(el, options);


}, false);

let firstStart =true;

function getStorage() {
	               
    storage.get('userData', function (error, data) {
        if (error) throw error;

        const response = data
        console.log("Loaded from electron storage:", response);
        
        if(response != null && response.entries != null) {
            allData = response;
            console.log("Using electron storage data, entries count:", allData.entries.length);
        } else {
            // Try to load from local data.json file as fallback
            try {
                const localData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                console.log("Loaded from local data.json:", localData);
                if (localData && localData.entries) {
                    allData = localData;
                    console.log("Using local file data, entries count:", allData.entries.length);
                    // Save to electron storage for future use
                    storage.set('userData', allData, function (error) {
                        if (error) console.error("Error saving to electron storage:", error);
                    });
                } else {
                    allData = {entries:[]};
                }
            } catch (fileError) {
                console.log("Could not read local data.json, using empty data");
                allData = {entries:[]};
            }
        }

        // handle the json data here
        $(".twofa-list").html("");

        var time = new Date();

        // var t1 = time.getTime()

        // const { expires } = TOTP.generate(allData.entries[0].info.secret, {
        //     digits: allData.entries[0].info.digits,
        //     period: allData.entries[0].info.period,
        //     timestamp: Date.now(),
        // })
        
        remainSeconds = 30 - (Math.floor(time / 1000) % 30);
        
        if (allData.entries && allData.entries.length > 0) {
            console.log("Rendering entries:", allData.entries.length);
            console.log("All entries before sort:", allData.entries.map(e => ({name: e.name, queue: e.queue})));
            
            const sortedEntries = allData.entries.sort((a, b) => (a.queue || 0) - (b.queue || 0));
            console.log("Sorted entries:", sortedEntries.map(e => ({name: e.name, queue: e.queue})));
            
            sortedEntries.forEach((x, index) => {
                console.log(`Rendering entry ${index + 1}:`, x.name, "queue:", x.queue);
                const key = x.info.secret
                x.id = x.id ?? Math.random().toString(36);

                const { otp } = TOTP.generate(key, {
                    digits: x.info.digits,
                    period: x.info.period,
                    timestamp: Date.now(),
                })
                var optText = otp.toString().substring(0, 3) + " <span>" + otp.toString().substring(3, 6) + "</span> ";
                

                $(".twofa-list").append(`
                    <li class="row-2fa mdc-list-item" dataid="${x.id}">
                        <span class="mdc-list-item__ripple"></span>
                        <div class="mdc-list-item__start ${editActive ? "":"hide-on"}">
                            <i class="material-icons" aria-hidden="true">drag_handle</i>
                        </div>
                        <span class="mdc-list-item__content">
                            <span class="mdc-list-item__primary-text">${x.name}</span>
                            <span class="mdc-list-item__secondary-text code" otpdata="${otp}">${optText}</span>
                        </span>
                        <div class="mdc-list-item__end">
                            <div class="time-wrapper">
                                <div class="countdown-circle"></div>
                                <div id="countdown" name="countdown"><div class="time"><div>${ firstStart ?'':'30' }</div></div></div>
                            </div>
                            <div class="f-edit ${editActive ? "":"hide-on"}">
                                <button class="edit mdc-icon-button" dataid="${x.id}">
                                    <i class="material-icons" aria-hidden="true">edit</i>
                                </button>
                            </div>
                            <div class="f-delete ${editActive ? "":"hide-on"}">
                                <button class="delete mdc-icon-button" dataid="${x.id}">
                                    <i class="material-icons" aria-hidden="true">delete</i>
                                </button>
                            </div>
                        </div>
                    </li>
                `)
            })
        } else {
            console.log("No entries found to render");
        }

        if(firstStart)
        {
            // Initialize countdown circles
            var progress = remainSeconds / 30;
            var rotation = (1 - progress) * 360 - 90;
            $(".countdown-circle::before").css("transform", `rotate(${rotation}deg)`);
            
            $(document).trigger("onListLoaded");
            firstStart=false;
        }
        else
        {
            timeDown(remainSeconds)
            //circleAnimation(113,30);
        }
    });
}

function setStorage() {
    console.log("Saving data:", allData);
    console.log("Entries count:", allData.entries ? allData.entries.length : 0);
    
    storage.set('userData', allData, function (error) {
        if (error) {
            console.error("Storage error:", error);
            throw error;
        }

        console.log("Data saved successfully");
        $("#addNewModal").find("input").val("");
        $("#addNewModal").attr("dataid","");

        addModal.close();
        deleteModal.close();

        getStorage();
    });
}

function toast() {
    if(!snackbar){
        snackbar = new mdc.snackbar.MDCSnackbar(document.getElementById('snackbar'))
    }
    snackbar.labelText = "Kopyalandı";
    snackbar.open();
}

function timeDown(_remainSeconds){

    var countdown = _remainSeconds;
    countdownNumberEl.html(countdown);
    setInterval(function() {
        countdown = --countdown <= 0 ? _remainSeconds : countdown;
        countdownNumberEl.html(countdown);
    }, 1000);
}

function circleAnimation(remainpercentanimation,remainSeconds) {

    // document.styleSheets[1].cssRules[31].style.animationDuration=Math.round(remainSeconds)+"s"
    document.styleSheets[1].cssRules[31].style.animationDuration="30s"
    
    let myRules = document.styleSheets[1].cssRules;
    let keyframes = myRules[32];
    var rule =keyframes.findRule("from");
    
    //rule.style.strokeDashoffset = Math.round(100-remainpercentanimation)+"px";
    rule.style.strokeDashoffset = "0px";

}

var interval;

$(document).ready(function () {

    $(window).on("focus",function(event){
        firstStart = true;
        getStorage()
    });

    // Toggle edit mode function
    function toggleEditMode() {
        if(editActive) {
            $(".mdc-list-item__start, .f-edit, .f-delete").addClass("hide-on");
            $(".edit-btn").removeClass("active");
            editActive=false;
            console.log("Edit mode disabled");
        } 
        else    {
            $(".mdc-list-item__start, .f-edit, .f-delete").removeClass("hide-on");
            $(".edit-btn").addClass("active");
            editActive=true;
            console.log("Edit mode enabled");
        }
    }

    // Settings button (optional - can still be used)
    $(document).on("click", ".edit-btn", function(event){
        event.preventDefault();
        event.stopPropagation();
        console.log("Settings button clicked, editActive:", editActive);
        toggleEditMode();
    });


    $(document).on("onListLoaded", function (remainSeconds) {

        var remainpercent = Math.round((remainSeconds / 30) * 113);
        var remainpercentanimation = Math.round((remainpercent / 113) * 100);
                
        //circleAnimation(remainpercentanimation,remainSeconds);
        
        if(!countdownNumberEl)
            countdownNumberEl = $('.time div');

        var countdown = remainSeconds;
        // countdownNumberEl.html(countdown);
        interval =  setInterval(function() {
                countdown = --countdown <= 0 ? 30 : countdown;
                //countdownNumberEl.html(countdown);
                if(countdown <=0)
                    clearInterval(interval);
            }, 1000);
        });
    
    setInterval(function () {
        if (remainSeconds <= 1) {
            $(".time div").html("");
            // Reset all countdown circles to full rotation
            $(".countdown-circle::before").css("transform", "rotate(-90deg)");
            // readData()
            getStorage();
        }
        else {
            remainSeconds--;
            $(".time div").html(remainSeconds);
            
            // Update countdown circle border - rotate to show decreasing progress
            var progress = remainSeconds / 30; // Progress from 1 to 0
            var rotation = (1 - progress) * 360 - 90; // Rotate from -90deg to 270deg
            $(".countdown-circle::before").css("transform", `rotate(${rotation}deg)`);
        }

    }, 1000)

    // Long press functionality for showing/hiding edit controls
    function startLongPress(e) {
        // Don't start long press if clicking on edit/delete buttons or drag handle
        if ($(e.target).closest('.edit, .delete, .mdc-list-item__start').length > 0) {
            return;
        }
        
        var target = e.currentTarget;
        longPressTimer = setTimeout(function() {
            toggleEditMode();
            // Add visual feedback
            $(target).addClass('long-press-active');
            setTimeout(function() {
                $(target).removeClass('long-press-active');
            }, 200);
        }, longPressDelay);
    }

    function cancelLongPress() {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    }

    // Mouse events
    $(document).on("mousedown", ".row-2fa", startLongPress);
    $(document).on("mouseup mouseleave", ".row-2fa", cancelLongPress);

    // Touch events for mobile
    $(document).on("touchstart", ".row-2fa", function(e) {
        e.preventDefault();
        startLongPress(e);
    });
    
    $(document).on("touchend touchcancel", ".row-2fa", function(e) {
        e.preventDefault();
        cancelLongPress();
    });

    // Regular click for copying (only if not in edit mode)
    $(document).on("click", ".row-2fa", function (e) {
        // Don't copy if clicking on edit/delete buttons or drag handle
        if ($(e.target).closest('.edit, .delete, .mdc-list-item__start').length > 0) {
            return;
        }
        
        // Don't copy if in edit mode
        if (editActive) {
            return;
        }
        
        var target = e.currentTarget;
        var value = $(target).find(".code").attr("otpdata");
        navigator.clipboard.writeText(value);
        alert(value)
        toast();
    })

    $(document).on("click", ".delete", function (e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("Delete button clicked");
        var target = e.currentTarget;
        var value = $(target).attr("dataid")
        console.log("Delete ID:", value);
        $("#deleteModal").attr("dataid", value)
        deleteModal.open();
    })

    $(document).on("click", ".addnew", function (e) {
        e.preventDefault();
        addModal.open();
    })

    $(document).on("click", ".edit", function (e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("Edit button clicked");
        var target = e.currentTarget;
        var value = $(target).attr("dataid")
        console.log("Edit ID:", value);
        $("#addNewModal").attr("dataid", value)

        var entity = allData.entries.find(x => { return x.id == value });
        $("#name").val(entity.name );
        $("#secret").val(entity.info.secret);

        addModal.open();
    })

    $(document).on("click", ".save-btn", function (e) {
        e.preventDefault();

        var value = $("#addNewModal").attr("dataid");

        // Ensure allData.entries exists
        if (!allData.entries) {
            allData.entries = [];
        }

        if(!value){
            var date = new Date();
            var entity = {
                "id": date.getTime(),
                "type": "totp",
                "name": $("#name").val(),
                "issuer": $("#name").val(),
                "icon": null,
                "info": {
                    "secret": $("#secret").val(),
                    "algo": "SHA1",
                    "digits": 6,
                    "period": 30
                }
            }
            allData.entries.push(entity);
            console.log("Added new entry, total entries:", allData.entries.length);
        }
        else{
            var entity = allData.entries.find(x => { return x.id == value });
            if (entity) {
                entity.name = $("#name").val();
                entity.info.secret = $("#secret").val();
                console.log("Updated entry:", entity.name);
            }
        }

        // writeData();
        setStorage()
    })

    $(document).on("click", ".delete-btn", function (e) {
        e.preventDefault();
        var value = $("#deleteModal").attr("dataid");
        allData.entries = allData.entries.filter(x => {
            return x.id != value
        })
        //writeData()
        setStorage()
    })
});