import Loan from './Loan.js';

/**
 * Class which models loan's balance over time which includes payments and interest grown
 * also accepts extra to applied to loans over their lifecycle
 */
class Lifecycle {

  /**
   * @param  {[type]}  loans           Loan objects to convert into Loan instances
   * @param  {String}  options.method  how should global amount extra be applied over span of lifecycle
   * @param  {[type]}  options.extra   how much global extra should be applied to loans
   * @param  {Boolean} options.vanilla should we run default lifecycle
   * @param  {[type]}  options.test    do not run lifecycle, for testing purposes
   * @return {[type]}                  Returns instance of lifecycle instance.
   */

  /* eslint-disable */
  constructor(loans, { method="NONE", extra=0 }={ method: "NONE", extra: 0 }, { vanilla=false, test=false }={}) {
    /* eslint-enable */

    this.method = method;
    this.extra = extra;

    if (!loans) throw "No Loans Provided";
    this.loans = loans;

    var Loans = [];
    this.Loans = Loans;

    loans.forEach((loan) => {
      Loans.push(new Loan(loan));
    });

    this.lifecycle = {
      method: method,
      extra: extra,
      series: [],
      startDate: null,
      endDate: null,
      totalInterestPaid: 0,
      totalInterestPaidByExtra: 0,
      totalPrincipalPaid: 0, //total + toalPaidByExtra = overall total, poor naming convention
      totalPrincipalPaidByExtra: 0,
      totalExtraPaid: 0,
      totalPaid: 0,
    };

    this._state = {
      amountExtraNow: 0,
      monthIndex: 0,
      maxBalance: 0,
      balance: 0,
      interest: 0,
      principal: 0
    };

    if (!test)
      this.live();

    return this;
  }

  /**
   * fills lifecycle object with series information, calculates lifecycles for all loans provided to instance with setings
   */
  live() {

    //main lifecycle loop
    while (this._lifecycleIncomplete()) {

      this._initializeState();

      this._payLoans();

      this._state.monthIndex++;

    }

    this.lifecycle.endDate =
      this.lifecycle.series.length ?
        this.lifecycle.series[this.lifecycle.series.length - 1].date :
        new Date();

    if (!this.lifecycle.startDate)
      this.lifecycle.startDate = new Date();
  }

  /**
   * Refreshes internal values used to calculate series objects in a month's span
   */
  _initializeState() {
    this._sortLoansByMethod();
    this._state.amountExtraNow = this.extra;
    this._state.balance = 0;
    this._state.interest = 0;
    this._state.principal = 0;

    let self = this;
    let dates = {};
    //want to keep track of ordering for applying extra to loan payments
    this.Loans.forEach((L) => {
      if (L.alive) {
        if (!dates[L.dueDate]) {
          dates[L.dueDate] = self._initSeriesObj(L.dueDate);
        }

        self._state.balance = Number(Big(self._state.balance).plus(L.balance));
        self._state.interest = Number(Big(self._state.interest).plus(L.interest));
        self._state.principal = Number(Big(self._state.principal).plus(L.principal));
      }
    });

    if (self._state.balance > self._state.maxBalance) {
      self._state.maxBalance = self._state.balance;
    }

    this._state.dates = dates;
  }

  /**
   * Main series calculations done here
   * For one month, Loans age and are paid off for the month
   * Balance calculations for each individual date are done at the end of method
   */
  _payLoans() {
    let self = this;

    this.Loans.forEach(function (L) {
      if (L.alive) {
        L.age();
        //grab montly date object
        let cumulativeSeriesDate = self._state.dates[L.dueDate];

        //get variables from receipt
        let {
          amountPaid,

          principalPaid,
          principalPaidByExtra,

          interestPaid,
          interestPaidByExtra
        } = L.makePayment(self._state.amountExtraNow);

        //find extra paid and subtract from state
        let extraPaid = principalPaidByExtra + interestPaidByExtra;
        self._state.amountExtraNow -= extraPaid;

        //series object calculations
        cumulativeSeriesDate.payments++;
        cumulativeSeriesDate.amountPaid += amountPaid;
        cumulativeSeriesDate.extraPaid += extraPaid;
        cumulativeSeriesDate.principalPaid += principalPaid;
        cumulativeSeriesDate.principalPaidByExtra += principalPaidByExtra;
        cumulativeSeriesDate.interestPaid += interestPaid;
        cumulativeSeriesDate.interestPaidByExtra += interestPaidByExtra;

        //aggregate calculations
        self.lifecycle.totalPaid += amountPaid;
        self.lifecycle.totalExtraPaid += extraPaid;
        self.lifecycle.totalPrincipalPaid += principalPaid;
        self.lifecycle.totalPrincipalPaidByExtra += principalPaidByExtra;
        self.lifecycle.totalInterestPaid += interestPaid;
        self.lifecycle.totalInterestPaidByExtra += interestPaidByExtra;
      }

    });

    //put all date series objects into series array
    //update balance by date
    _.forIn(this._state.dates, (el) => {
      self._state.balance -= el.amountPaid;
      self._state.principal -= (el.principalPaid + el.principalPaidByExtra);
      self._state.interest += (el.interestPaid + el.interestPaidByExtra);

      el.balance = self._state.balance;
      el.principal = self._state.principal;
      el.interest = self._state.interest;

      if (!self.lifecycle.startDate)
        self.lifecycle.startDate = el.date;

      self.lifecycle.series.push(el);

    });

  }

  /**
   * [search description]
   * @param  {[type]}  [minDate       [description]
   * @param  {[type]}  maxDate]       [description]
   * @param  {Boolean} returnElements [description]
   * @return {[type]}                 [description]
   */
  search([minDate, maxDate], returnElements=false) {
    let res;

    if (returnElements)
      res = [];
    else
      res = {
        totalInterestPaid: 0,
        totalInterestPaidByExtra: 0,
        totalPrincipalPaid: 0,
        totalPrincipalPaidByExtra: 0,
        totalExtraPaid: 0,
        totalPaid: 0,
      };

    this.lifecycle.series.forEach((el) => {
      if (el.date >= minDate && el.date <= maxDate) {
        if (returnElements) {
          res.push(el);
        } else {
          res.totalInterestPaid += el.interestPaid;
          res.totalInterestPaidByExtra += el.interestPaidByExtra;

          res.totalPrincipalPaid += el.principalPaid;
          res.totalPrincipalPaidByExtra += el.principalPaidByExtra;

          res.totalPaid += el.amountPaid;
        }
      }
    });
    return res;
  }

  /**
   * are all loans dead?
   * @param  {[type]} loans [description]
   * @return {[type]}       [description]
   */
  _lifecycleIncomplete() {
    var isComplete = true;

    this.Loans.forEach((Loan) => {
      if (Loan.alive) {
        isComplete = false;
      }
    });

    return !isComplete;
  }

  /**
   * bubble sort implementation, takes key
   * @param  {[type]} key   [description]
   * @return {[type]}       [description]
   */
  _sortLoans(key) {
    var flag = false;
    var prev = this.Loans[0];
    for (var i = 1; i < this.Loans.length; i++) {
      var curr = this.Loans[i];
      if (prev[key] > curr[key]) {
        this.Loans[i] = prev;
        this.Loans[i - 1] = curr;
        flag = true;
      }
      prev = this.Loans[i];
    }
    if (!flag)
      return this.Loans;
    else
      return this._sortLoans(key);
  }

  /**
   * [_sortLoansByMethod description]
   * @return {[type]} [description]
   */
  _sortLoansByMethod() {
    switch (this.method) {
    case 'HI_INTEREST':
      this._sortLoans('interestRate');
      break;
    case 'LO_BALANCE':
      this._sortLoans('balance');
      break;
    case 'NONE':
      this._sortLoans('dueDate');
      break;
    }
  }

  /**
   * returns initialized month object for series
   * @return {[type]} [description]
   */
  _initSeriesObj(day) {
    let date = this._timeHelper(this._state.monthIndex, day);
    return {
      day,
      date,
      payments: 0,

      balance: 0,
      interest: 0,
      principal: 0,

      minimumPayment: 0,
      amountPaid: 0,
      extraPaid: 0,
      interestPaid: 0,
      interestPaidByExtra: 0,
      principalPaid: 0,
      principalPaidByExtra: 0,
    };
  }

  /**
   * transform month, day of payment  to new date
   * @param  {Number} month [Month away from today's month]
   * @param  {Number} day   [day in month]
   * @return {Date}         returns future date
   */
  _timeHelper(month, day = 1) {
    var d = new Date();
    var currMonth = d.getMonth();
    var currYear = d.getFullYear();

    var date = new Date(Math.floor((currMonth + month) / 12) + currYear, (currMonth + month) % 12, day);
    return date;
  }

}

export default Lifecycle;
