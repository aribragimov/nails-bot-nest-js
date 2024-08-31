export const botCommands = {
  start: { main: '/start', regex: /\/start/ },
  win: {
    get: {
      main: '/win/get',
      today: '/win/get/today',
      week: '/win/get/week',
      nextWeek: '/win/get/next_week',
      month: '/win/get/month',
      all: '/win/get/all',
    },
    create: {
      main: '/win/create',
      one: {
        regex: /(\d{2}:\d{2},\s)*\d{2}:\d{2}/,
        main: '/win/create/one',
        selectMonth: { regex: /^\/win\/c\/month\/(\d{1,2})$/ },
        selectDay: { regex: /^\/win\/c\/month\/(\d{1,2})\/day\/(\d{1,2})$/ },
      },
      many: { main: '/win/create/many', regex: /\d{2}\.\d{2}:\s(\d{2}:\d{2},\s)*\d{2}:\d{2}/ },
    },
    update: {
      main: '/win/update',
      selectMonth: { regex: /^\/win\/u\/isBooked\/month\/(\d{1,2})$/ },
      selectDay: { regex: /^\/win\/u\/isBooked\/month\/(\d{1,2})\/day\/(\d{1,2})$/ },
    },
    delete: '/win/delete',
  },
};
