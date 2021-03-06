/*
 * 0xtrades.info
 * https://github.com/vsergeev/0xtrades.info
 *
 * Copyright (c) 2017 Ivan (Vanya) A. Sergeev
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/******************************************************************************/
/* Panel Base Class */
/******************************************************************************/

var PanelCounter = 0;

var Panel = function (view) {
  this._view = view;
  this._id = PanelCounter++;
  this._title = null;
  this._dom = null;
  this._root = null;
};

Panel.prototype = {
  create: function (root) {
    /* Create skeleton DOM with header, header link, and close button */
    var dom = $(`
      <div class="row panel-header">
        <span class="anchor" id="panel-${this._id}"></span>
        <div class="panel-controls-wrapper">
          <div class="panel-controls">
            <a class="panel-header-link" href="#panel-${this._id}"><i class="icon-link"></i></a>
            <a class="panel-close" href="#"><i class="icon-cancel"></i></a>
          </div>
        </div>
        <h3>${this._title}</h3>
      </div>
      <div class="panel-content">
      </div>
    `);

    /* Associate callback for close button */
    dom.find(".panel-close")
      .on('click', {panel: this, view: this._view}, function (e) {
        e.preventDefault();
        e.data.view.panelRemove(e.data.panel);
      });

    root.append(dom);

    this._dom = dom;
    this._root = root;
  },

  destroy: function () {
    if (this._dom) {
      this._dom.remove();
      this._dom = null;
    }

    this._root = null;
    this._view = null;
  },

  /* Event handlers */

  handleStatisticsUpdatedEvent: function (feeStats, volumeStats, priceVolumeHistory) {
    /* Implemented in derived classes */
  },

  handleNewTradeEvent: function (trades, newTrade) {
    /* Implemented in derived classes */
  },

  handleRefreshEvent: function () {
    /* Implemented in derived classes */
  },
};

var derive = function (base, prototype) {
  return Object.assign(Object.create(base.prototype), prototype);
}

/******************************************************************************/
/* EmptyPanel */
/******************************************************************************/

var EmptyPanel = function (view) {
  Panel.call(this, view);
  this._title = "Empty Panel";
};

EmptyPanel.prototype = derive(Panel, {
  constructor: EmptyPanel,

  create: function (root) {
    Panel.prototype.create.call(this, root);

    var elem = $(`
      <div class="row text-center">
        <button type="button" class="btn btn-sm btn-info">Split</button>
      </div>
    `);

    elem.find('button').click(this.handleSplit.bind(this));

    /* FIXME add drop down panel select */

    this._root.find('.panel-content').append(elem);
  },

  handleSplit: function () {
    var root = this._root;

    this._view.panelRemove(this);

    [panel1, panel2] = this._view.domSplitPanelRow(root);
    this._view.panelCreate(panel1, EmptyPanel);
    this._view.panelCreate(panel2, EmptyPanel);
  },

  handeSelect: function (choice) {
    var root = this._root;

    this._view.panelRemove(this);

    this._view.panelCreate(root, EmptyPanel /* FIXME */);
  },
});

/******************************************************************************/
/* VolumeStatisticsPanel */
/******************************************************************************/

var VolumeStatisticsPanel = function (view) {
  Panel.call(this, view);
  this._title = "Volume (24 hr)";
};

VolumeStatisticsPanel.prototype = derive(Panel, {
  constructor: VolumeStatisticsPanel,

  create: function (root) {
    Panel.prototype.create.call(this, root);

    var elem = $(`
      <div class="row">
        <table class="table table-condensed table-sm borderless volume-statistics">
          <tbody>
          </tbody>
        </table>
      </div>
    `);

    this._root.find('.panel-content').append(elem);
  },

  handleStatisticsUpdatedEvent: function (feeStats, volumeStats, priceVolumeHistory) {
    /* Clear current volumes */
    this._root.find("tr").remove();

    /* Look up currency information */
    var currencyInfo = FIAT_CURRENCY_MAP[feeStats.fiatCurrency];

    /* Aggregate fiat volume */
    if (volumeStats.totalVolumeFiat.gt(0)) {
      var elem = $('<tr></tr>')
                   .append($('<th></th>')
                              .text("Aggregate Volume"))
                   .append($('<td></td>')
                              .text(this._view.formatPrice(volumeStats.totalVolumeFiat, currencyInfo)));
      this._root.find("tbody").first().append(elem);
    }

    /* ZRX Fees */
    var totalRelayFees = feeStats.totalFees.toFixed(6);
    if (feeStats.totalFeesFiat)
      totalRelayFees += " (" + this._view.formatPrice(feeStats.totalFeesFiat, currencyInfo) + ")";

    var elem = $('<tr></tr>')
                 .append($('<th></th>')
                            .append(this._view.formatTokenLink(ZEROEX_TOKEN_ADDRESS))
                            .append($("<span></span>")
                                      .text(" Relay Fees")))
                 .append($('<td></td>')
                           .text(totalRelayFees));
    this._root.find("tbody").first().append(elem);

    /* Token Volumes */
    var tokens = Object.keys(volumeStats.tokens);
    for (var i = 0; i < tokens.length; i++) {
      if (ZEROEX_TOKEN_INFOS[tokens[i]]) {
        var volume = volumeStats.tokens[tokens[i]].volume.toFixed(6);
        if (volumeStats.tokens[tokens[i]].volumeFiat.gt(0))
          volume += " (" + this._view.formatPrice(volumeStats.tokens[tokens[i]].volumeFiat, currencyInfo) + ")";

        var elem = $('<tr></tr>')
                     .append($('<th></th>')
                              .append(this._view.formatTokenLink(tokens[i])))
                     .append($('<td></td>')
                               .text(volume));
        this._root.find("tbody").first().append(elem);
      }
    }
  },
});

/******************************************************************************/
/* RecentTradesPanel */
/******************************************************************************/

var RecentTradesPanel = function (view) {
  Panel.call(this, view);
  this._title = "Recent Trades";
};

RecentTradesPanel.prototype = derive(Panel, {
  constructor: RecentTradesPanel,

  create: function (root) {
    Panel.prototype.create.call(this, root);

    var elem = $(`
      <div class="row">
        <table class="table table-responsive table-condensed table-sm borderless recent-trades">
          <thead>
            <tr>
              <th>Time (UTC)</th>
              <th>Txid</th>
              <th>Trade</th>
              <th>Price (<span class="m_t">M:T</span><span class="t_m" style="display:none;">T:M</span><i class="icon-exchange price-invert"></i>)</th>
              <th>Relay</th>
              <th>Maker Fee</th>
              <th>Taker Fee</th>
            </tr>
          </thead>
          <tbody>
          </tbody>
        </table>
      </div>
      <div class="row">
        <div class="text-center">
          <button type="button" class="btn btn-sm btn-info recent-trades-fetch-more" disabled>Fetch more...</button>
        </div>
      </div>
    `);

    elem.find('i').click(this.handlePriceInvert.bind(this));
    elem.find('button').click(this.handleFetchMore.bind(this));

    this._root.find('.panel-content').append(elem);

    this._priceInverted = false;
    this._initialized = false;
  },

  handleNewTradeEvent: function (trades, index, newTrade) {
    if (!this._initialized) {
      for (var i = 0; i < trades.length; i++)
        this.addNewTrade(i, trades[i]);

      this._root.find("button.recent-trades-fetch-more").prop('disabled', false);

      this._initialized = true;
    } else {
      this.addNewTrade(index, newTrade);
    }
  },

  addNewTrade: function (index, trade) {
    /* Format time stamp */
    var timestamp = this._view.formatDateTime(new Date(trade.timestamp*1000));

    /* Format trade string */
    var swap = $("<span></span>")
                .append($(trade.makerNormalized ? "<span></span>" : "<i></i>").text(trade.makerVolume.toDigits(6) + " "))
                .append(this._view.formatTokenLink(trade.makerToken))
                .append($("<span></span>").text(" ↔ "))
                .append($(trade.takerNormalized ? "<span></span>" : "<i></i>").text(trade.takerVolume.toDigits(6) + " "))
                .append(this._view.formatTokenLink(trade.takerToken));

    /* Format price */
    var price = $("<span></span>")
                  .append($("<span></span>")
                            .toggle(!this._priceInverted)
                            .addClass("m_t")
                            .text(trade.mtPrice ? trade.mtPrice.toDigits(6) : "Unknown"))
                  .append($("<span></span>")
                            .toggle(this._priceInverted)
                            .addClass("t_m")
                            .text(trade.tmPrice ? trade.tmPrice.toDigits(6) : "Unknown"));

    /* Create row for trade list */
    var elem = $('<tr></tr>')
                .append($('<td></td>')      /* Time */
                          .text(timestamp))
                .append($('<td></td>')      /* Transaction ID */
                          .html(this._view.formatTxidLink(trade.txid, this._view.formatHex(trade.txid, 8))))
                .append($('<td></td>')      /* Trade */
                          .addClass('overflow')
                          .html(swap))
                .append($('<td></td>')      /* Price */
                          .html(price))
                .append($('<td></td>')      /* Relay Address */
                          .html(this._view.formatRelayLink(trade.relayAddress)))
                .append($('<td></td>')      /* Maker Fee */
                          .addClass('overflow-sm')
                          .text(trade.makerFee.toDigits(6) + " ZRX"))
                .append($('<td></td>')      /* Taker Fee */
                          .addClass('overflow-sm')
                          .text(trade.takerFee.toDigits(6) + " ZRX"));

    /* Add to trade list */
    if (this._root.find("tbody").children().length == 0)
      this._root.find("tbody").append(elem);
    else
      this._root.find("tr").eq(index).after(elem);
  },

  handlePriceInvert: function () {
    this._priceInverted = !this._priceInverted;
    this._root.find('.t_m').toggle()
    this._root.find('.m_t').toggle()
  },

  handleFetchMore: function () {
    this._view.fetchMoreCallback(BLOCK_FETCH_COUNT);
  },
});

/******************************************************************************/
/* TokenVolumeChartPanel */
/******************************************************************************/

var TokenVolumeChartPanel = function (view) {
  Panel.call(this, view);
  this._title = "Token Volume (24 hr)";
};

TokenVolumeChartPanel.prototype = derive(Panel, {
  constructor: TokenVolumeChartPanel,

  create: function (root) {
    Panel.prototype.create.call(this, root);

    var elem = $(`
      <div class="row canvas-wrapper text-center">
        <canvas width="400" height="400"></canvas>
      </div>
    `);

    this._root.find(".panel-content").append(elem);

    var chartConfig = {
      type: 'pie',
      options: {responsive: true, tooltips: {callbacks: {label: CHART_DEFAULT_TOOLTIP_CALLBACK}}},
      data: { datasets: [{ backgroundColor: CHART_DEFAULT_COLORS, tooltips: [] }] }
    };
    this._chart = new Chart(elem.find('canvas')[0].getContext('2d'), chartConfig);
  },

  handleStatisticsUpdatedEvent: function (feeStats, volumeStats, priceVolumeHistory) {
    /* Look up currency information */
    var currencyInfo = FIAT_CURRENCY_MAP[feeStats.fiatCurrency];

    var tokens = Object.keys(volumeStats.tokens);
    var tokenNames = [];
    var tokenVolumes = []
    var tokenVolumesFormatted = [];

    for (var i = 0; i < tokens.length; i++) {
      if (ZEROEX_TOKEN_INFOS[tokens[i]] && volumeStats.tokens[tokens[i]].volumeFiat.gt(0)) {
        tokenNames.push(ZEROEX_TOKEN_INFOS[tokens[i]].symbol);
        tokenVolumes.push(volumeStats.tokens[tokens[i]].volumeFiat.toNumber());
        tokenVolumesFormatted.push(this._view.formatPrice(volumeStats.tokens[tokens[i]].volumeFiat, currencyInfo));
      }
    }

    this._chart.data.labels = tokenNames;
    this._chart.data.datasets[0].data = tokenVolumes;
    this._chart.data.datasets[0].tooltips = tokenVolumesFormatted;
    this._chart.update();
  },
});

/******************************************************************************/
/* TokenOccurrenceChartPanel */
/******************************************************************************/

var TokenOccurrenceChartPanel = function (view) {
  Panel.call(this, view);
  this._title = "Token Occurrence (24 hr)";
};

TokenOccurrenceChartPanel.prototype = derive(Panel, {
  constructor: TokenOccurrenceChartPanel,

  create: function (root) {
    Panel.prototype.create.call(this, root);

    var elem = $(`
      <div class="row canvas-wrapper text-center">
        <canvas width="400" height="400"></canvas>
      </div>
    `);

    this._root.find(".panel-content").append(elem);

    var chartConfig = {
      type: 'pie',
      options: {responsive: true, tooltips: {callbacks: {label: CHART_DEFAULT_TOOLTIP_CALLBACK}}},
      data: { datasets: [{ backgroundColor: CHART_DEFAULT_COLORS, tooltips: [] }] }
    };
    this._chart = new Chart(elem.find('canvas')[0].getContext('2d'), chartConfig);
  },

  handleStatisticsUpdatedEvent: function (feeStats, volumeStats, priceVolumeHistory) {
    var tokens = Object.keys(volumeStats.tokens);
    var tokenNames = [];
    var tokenCounts = [];

    for (var i = 0; i < tokens.length; i++) {
      if (ZEROEX_TOKEN_INFOS[tokens[i]]) {
        tokenNames.push(ZEROEX_TOKEN_INFOS[tokens[i]].symbol);
        tokenCounts.push(volumeStats.tokens[tokens[i]].count);
      }
    }

    this._chart.data.labels = tokenNames;
    this._chart.data.datasets[0].data = tokenCounts;
    this._chart.update();
  },
});

/******************************************************************************/
/* FeeFeelessChartPanel */
/******************************************************************************/

var FeeFeelessChartPanel = function (view) {
  Panel.call(this, view);
  this._title = "Fee vs. Fee-less Trades (24 hr)";
};

FeeFeelessChartPanel.prototype = derive(Panel, {
  constructor: FeeFeelessChartPanel,

  create: function (root) {
    Panel.prototype.create.call(this, root);

    var elem = $(`
      <div class="row canvas-wrapper text-center">
        <canvas width="400" height="400"></canvas>
      </div>
    `);

    this._root.find(".panel-content").append(elem);

    var chartConfig = {
      type: 'pie',
      options: {responsive: true, tooltips: {callbacks: {label: CHART_DEFAULT_TOOLTIP_CALLBACK}}},
      data: { datasets: [{ backgroundColor: CHART_DEFAULT_COLORS, tooltips: [] }] }
    };
    this._chart = new Chart(elem.find('canvas')[0].getContext('2d'), chartConfig);
  },

  handleStatisticsUpdatedEvent: function (feeStats, volumeStats, priceVolumeHistory) {
    this._chart.data.labels = ["Fee", "Fee-less"];
    this._chart.data.datasets[0].data = [feeStats.feeCount, feeStats.feelessCount];
    this._chart.update();
  },
});

/******************************************************************************/
/* RelayFeeChartPanel */
/******************************************************************************/

var RelayFeeChartPanel = function (view) {
  Panel.call(this, view);
  this._title = "Relay Fee Distribution (24 hr)";
};

RelayFeeChartPanel.prototype = derive(Panel, {
  constructor: RelayFeeChartPanel,

  create: function (root) {
    Panel.prototype.create.call(this, root);

    var elem = $(`
      <div class="row canvas-wrapper text-center">
        <canvas width="400" height="400"></canvas>
      </div>
    `);

    this._root.find(".panel-content").append(elem);

    var chartConfig = {
      type: 'pie',
      options: {responsive: true, tooltips: {callbacks: {label: CHART_DEFAULT_TOOLTIP_CALLBACK}}},
      data: { datasets: [{ backgroundColor: CHART_DEFAULT_COLORS, tooltips: [] }] }
    };
    this._chart = new Chart(elem.find('canvas')[0].getContext('2d'), chartConfig);
  },

  handleStatisticsUpdatedEvent: function (feeStats, volumeStats, priceVolumeHistory) {
    var relayAddresses = Object.keys(feeStats.relays);
    var relayNames = [];
    var relayFees = [];
    var relayFeesFormatted = [];

    for (var i = 0; i < relayAddresses.length; i++) {
      if (web3.toDecimal(relayAddresses[i]) == 0)
        continue;

      relayNames.push(this._view.formatRelay(relayAddresses[i]));
      relayFees.push(feeStats.relays[relayAddresses[i]].toNumber());
      relayFeesFormatted.push(feeStats.relays[relayAddresses[i]].toDigits(6) + " ZRX");
    }

    this._chart.data.labels = relayNames;
    this._chart.data.datasets[0].data = relayFees;
    this._chart.data.datasets[0].tooltips = relayFeesFormatted;
    this._chart.update();
  },
});

/******************************************************************************/
/* PriceChartPanel */
/******************************************************************************/

var PriceChartPanel = function (view) {
  Panel.call(this, view);
  this._title = "Price Chart (24 hr)";
};

PriceChartPanel.prototype = derive(Panel, {
  constructor: PriceChartPanel,

  create: function (root) {
    Panel.prototype.create.call(this, root);

    var elem = $(`
      <div class="row">
        <div class="dropdown-center">
          <button class="btn btn-default btn-sm dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true">
            <span class="price-chart-pair-text"></span>
            <span class="caret"></span>
          </button>
          <ul class="dropdown-menu" aria-labelledby="price-chart-pair-${this._id}"></ul>
        </div>
      </div>
      <div class="row canvas-wrapper text-center">
        <canvas width="800" height="400"></canvas>
      </div>
    `);

    this._root.find(".panel-content").append(elem);

    var chartConfig = {
      type: 'line',
      options: {
        responsive: true,
        legend: { display: false },
        scales: {
          xAxes: [
            { type: 'time', time: { unit: 'minute' }, ticks: { autoSkip: true, maxTicksLimit: 30 }, },
          ],
        }
      },
      data: {
        datasets: [
          { borderDash: [5, 5], borderColor: CHART_DEFAULT_COLORS[0], fill: false, },
        ]
      }
    };
    this._chart = new Chart(this._root.find("canvas")[0].getContext('2d'), chartConfig);

    this.handleSelectTokenPair(PRICE_CHART_DEFAULT_PAIR);
  },

  handleStatisticsUpdatedEvent: function (feeStats, volumeStats, priceVolumeHistory) {
    /* Update token pair list */
    var self = this;
    this._root.find('li').remove();
    for (var j = 0; j < priceVolumeHistory.tokens.length; j++) {
      this._root.find('ul').append(
        $("<li></li>")
          .append($("<a></a>")
                    .text(priceVolumeHistory.tokens[j])
                    .attr('href', '#')
                    .on('click', {pair: priceVolumeHistory.tokens[j]}, function (e) {
                      e.preventDefault();
                      self.handleSelectTokenPair(e.data.pair);
                      /* FIXME refresh hack */
                      self.handleStatisticsUpdatedEvent(null, null, self._view.getPriceVolumeHistoryCallback());
                    }))
      );
    }

    /* Update data */
    var currentTimestamp = moment();
    this._chart.options.scales.xAxes[0].time.min = currentTimestamp.clone().subtract(STATISTICS_TIME_WINDOW, 's');
    this._chart.options.scales.xAxes[0].time.max = currentTimestamp;
    this._chart.data.datasets[0].data = priceVolumeHistory.getPriceData(this._tokenPair);
    this._chart.update();
  },

  handleSelectTokenPair: function (tokenPair) {
    this._tokenPair = tokenPair;

    /* Update selected token pair */
    this._root.find("span.price-chart-pair-text").text(this._tokenPair);
  },
});
