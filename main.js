// new Game.shimmer('golden',{type:'cookie storm drop'},1);
// Game.gainBuff('click frenzy',Math.ceil(13),777)

Game.registerMod("auto shimmer", {
    init: function () {

        const utilize = Game.mods["utilize"];
        if (!utilize) Game.Notify("Auto Shimmer", "Utilize mod not found. This mod is required for full functionality.", [16, 5]);

        this._legitMode = false;

        this._configVersion = 1;
        this._configSuccessfullyLoaded = false;

        this.shouldNotify = true;
        this.shouldAutoAccept = false;

        this.shimmersClickedAutoTotal = 0;
        this.shimmersClickedAutoSession = 0;
        this.shimmersClickedManualTotal = 0;
        this.shimmersClickedManualSession = 0;

        if (!Game._autoShimmerHooked) {
            Game._autoShimmerHooked = true;
            this.initHooks();
        }

        if (utilize) utilize.subscribeToMenu((block, menu) => {
            const category = utilize.writeCategoryBlock(block, 'Auto Shimmer');

            if (!this._legitMode) utilize.writeButton(
                category,
                'autoShimmers_AutoAccept',
                'Auto-accept',
                () => this.shouldAutoAccept,
                () => this.setAutoAccept(!this.shouldAutoAccept)
            );

            utilize.writeButton(
                category,
                'autoShimmers_Notifications',
                'Notifications',
                () => this.shouldNotify,
                () => this.shouldNotify = !this.shouldNotify
            );
        });

        this.initShimmerDisplay();
        Game.Notify("Auto Shimmer", "Auto Shimmer mod loaded.", [16, 5], 6, true);
    },
    save: function () {
        return JSON.stringify({
            // Version
            v: 1,

            // Settings
            se: {
                sn: this.shouldNotify,
                saa: this.shouldAutoAccept
            },

            // Statistics
            st: {
                scat: this.shimmersClickedAutoTotal,
                scmt: this.shimmersClickedManualTotal
            }
        });
    },
    load: function (str) {
        if (!str) return;

        const objOld = JSON.parse(str);
        const obj = Object.assign({}, objOld);

        /* Version migration */
        const oldVersion = objOld.v || 0;

        let modified = false;
        let modifiedTo = oldVersion;

        // Convert from version 0 to version 1
        if (oldVersion === 0) {

            obj.se = {
                sn: objOld.sn !== undefined ? objOld.sn : true,
                saa: objOld.saa !== undefined ? objOld.saa : true
            };

            obj.st = {
                scat: 0,
                scat: objOld.sct || 0
            };

            delete obj.sn;
            delete obj.saa;
            delete obj.sct;

            obj.v = 1;

            modified = true;
            modifiedTo = 1;
        }

        if (modified) {
            Game.Notify("Auto Shimmer", `Config migrated from version ${oldVersion} to version ${modifiedTo}.`, [16, 5], 6, true);
        }

        /* Version checks */

        // Check if version is higher than expected
        if (obj.v > this._configVersion) {
            Game.Notify("Auto Shimmer", "Config version is newer than expected. The mod may be outdated.", [16, 5], 1, true);
            return;
        }

        // Check if version is lower than expected
        if (obj.v < this._configVersion) {
            Game.Notify("Auto Shimmer", "Config version is older than expected. The mod may have been updated.", [16, 5], 1, true);
            return;
        }

        /* Load */

        if (obj.se) {
            this.shouldNotify = obj.se.sn !== undefined ? obj.se.sn : true;
            this.shouldAutoAccept = obj.se.saa !== undefined ? obj.se.saa : true;
        }

        this.shouldAutoAccept = this.shouldAutoAccept && !this._legitMode;

        if (obj.st) {
            this.shimmersClickedAutoTotal = obj.st.scat !== undefined ? obj.st.scat : 0;
            this.shimmersClickedManualTotal = obj.st.scmt !== undefined ? obj.st.scmt : 0;
        }

        this._configSuccessfullyLoaded = true;
        this.updateShimmerDisplay();
    },
    initHooks: function () {
        this._prototypeInit = Game.shimmer.prototype.init;
        this._prototypePop = Game.shimmer.prototype.pop;
        this._gainBuff = Game.gainBuff;

        const MOD = this;

        Game.shimmer.prototype.init = function () {
            const result = MOD._prototypeInit.apply(this, arguments);
            if (MOD.shouldNotify) {
                PlaySound('snd/choir.mp3', 1);
                Game.Notify("Auto Shimmer", "A shimmer appeared!", [16, 5], 3, true);
            }

            if (MOD.shouldAutoAccept) setTimeout(() => {
                if (!Game.shimmers.includes(this)) return;

                this.autoPopped = true;
                this.pop();
            }, 1000);

            return result;
        };

        Game.shimmer.prototype.pop = function () {
            const wasAuto = this.autoPopped === true;
            this.autoPopped = false;

            const result = MOD._prototypePop.apply(this, arguments);

            if (wasAuto) {
                MOD.shimmersClickedAutoTotal += 1;
                MOD.shimmersClickedAutoSession += 1;
            } else {
                MOD.shimmersClickedManualTotal += 1;
                MOD.shimmersClickedManualSession += 1;
            }

            MOD.updateShimmerDisplay();
            return result;
        };

        Game.gainBuff = function (type, time, arg1, arg2, arg3) {
            const result = MOD._gainBuff.apply(this, arguments);
            if (!MOD.shouldNotify) return result;

            // Game.Notify("TESTING", `${type}`, [16, 5]);
            if (type === 'click frenzy') PlaySound('snd/spell.mp3', 1);

            return result;
        };
    },
    setAutoAccept: function (value) {
        if (this._legitMode) value = false;

        this.shouldAutoAccept = value;
        this.updateShimmerDisplay();
    },
    initShimmerDisplay: function () {
        if (l('autoShimmers_ShimmersClicked')) return;

        const span = document.createElement('span');
        span.id = 'autoShimmers_ShimmersClicked';
        span.style.fontSize = '10px';
        span.style.marginLeft = '10px';
        span.style.cursor = 'pointer';

        l('versionNumber').appendChild(span);
        this.updateShimmerDisplay();

        AddEvent(l('autoShimmers_ShimmersClicked'), 'click', () => {
            if (this._legitMode) return;

            this.setAutoAccept(!this.shouldAutoAccept);
            Game.Notify("Auto Shimmer", `Auto-accept is now ${value ? 'enabled' : 'disabled'}.`, [16, 5], 2, true);
        });
    },
    updateShimmerDisplay: function () {
        const display = l('autoShimmers_ShimmersClicked');
        if (!display) return;

        let tooltip = `<div style="padding:8px;width:250px;">`;

        if (this._legitMode) {
            display.textContent = `Shimmers clicked: ${this.shimmersClickedManualSession}`;

            tooltip += `Shimmers clicked this session: <b>${this.shimmersClickedManualSession}</b><br>`;
            tooltip += `Total shimmers clicked: <b>${this.shimmersClickedManualTotal}</b>`;
        } else {
            display.textContent = `Shimmers clicked: ${this.shimmersClickedAutoSession + this.shimmersClickedManualSession}`;

            tooltip += `Shimmers clicked this session:<br>`;
            tooltip += `&emsp;Auto: <b>${this.shimmersClickedAutoSession}</b><br>`;
            tooltip += `&emsp;Manual: <b>${this.shimmersClickedManualSession}</b><br><br>`;
            tooltip += `Total shimmers clicked:<br>`;
            tooltip += `&emsp;Auto: <b>${this.shimmersClickedAutoTotal}</b><br>`;
            tooltip += `&emsp;Manual: <b>${this.shimmersClickedManualTotal}</b>`;
        }

        tooltip += `</div>`;
        Game.attachTooltip(l('autoShimmers_ShimmersClicked'), tooltip, 'this');

        if (this.shouldAutoAccept) l('autoShimmers_ShimmersClicked').style.color = '#73ff73';
        else l('autoShimmers_ShimmersClicked').style.color = '';
    }
});