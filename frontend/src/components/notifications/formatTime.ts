const format = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Istanbul',
})

export const formatTime = (value: string) => format.format(new Date(value))
