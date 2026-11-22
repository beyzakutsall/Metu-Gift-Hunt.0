import type { ModelCredit as Credit } from '../../types/student'

// Required by the models' Creative Commons licences.
export function ModelCredit({ credit }: { credit: Credit }) {
  return (
    <p className="text-xs break-words text-ink-soft">
      3D model:{' '}
      <a href={credit.source} target="_blank" rel="noreferrer" className="underline underline-offset-2">
        {credit.title}
      </a>{' '}
      by {credit.author},{' '}
      <a href={credit.licenseUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
        {credit.license}
      </a>{' '}
      ({credit.changes})
    </p>
  )
}
