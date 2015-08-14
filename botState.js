'use strict';
/**
 * @file botState.js
 * @license GPL 3.0
 * @copyright 2015 Tom Worster fsb@thefsb.org
 *
 * Copyright 2015 Tom Worster
 *
 * This file is part of yii2docbot.
 *
 * yii2docbot is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * yii2docbot is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with yii2docbot.  If not, see <http://www.gnu.org/licenses/>.
 */
exports.recentSnoops = (function () {
    var snoopsAnswered = {},
        // miliseconds
        maxAge = 180000;
    return {
        isRecent: function (snoop) {
            return snoopsAnswered[snoop] && (snoopsAnswered[snoop] + maxAge > Date.now());
        },
        add: function (snoop) {
            snoopsAnswered[snoop] = Date.now();
        },
        flush: function () {
            var now = Date.now();
            Object.keys(snoopsAnswered).map(function (snoop) {
                if (snoopsAnswered[snoop] + maxAge < now) {
                    delete snoopsAnswered[snoop];
                }
            });
        }
    };
}());
