import { CLUE_MAX, RIDDLE_MAX, answersError, clueError, riddleError } from '../../../../shared/giftRules'
import type { PuzzleInput } from '../../types/gift'
import { Input } from '../common/Input'
import { TextArea } from '../common/TextArea'

export const EMPTY_PUZZLE: PuzzleInput = { clue: '', riddle: '', answer: '' }
export type PuzzleErrors = Partial<Record<keyof PuzzleInput, string>>

export const validatePuzzle = (value: PuzzleInput): PuzzleErrors => ({
  clue: clueError(value.clue),
  riddle: riddleError(value.riddle),
  answer: answersError(value.answer),
})

interface Props {
  prefix?: string // keeps ids unique when two forms are on the page
  /** Number of the first field in the form's steps. */
  step?: number
  value: PuzzleInput
  errors: PuzzleErrors
  readOnly: boolean
  onChange: (field: keyof PuzzleInput, value: string) => void
}

export function PuzzleFields({ prefix = '', step = 2, value, errors, readOnly, onChange }: Props) {
  return (
    <>
      <TextArea
        id={`${prefix}clue`}
        label={`${step}. Clue, shown when they arrive`}
        placeholder="Next to the noticeboard, by the blue door"
        maxLength={CLUE_MAX}
        value={value.clue}
        error={errors.clue}
        readOnly={readOnly}
        required
        onChange={(event) => onChange('clue', event.target.value)}
      />
      <TextArea
        id={`${prefix}riddle`}
        label={`${step + 1}. Riddle, if the camera can’t recognise the spot`}
        placeholder="In which hall is the event held?"
        maxLength={RIDDLE_MAX}
        value={value.riddle}
        error={errors.riddle}
        readOnly={readOnly}
        required
        onChange={(event) => onChange('riddle', event.target.value)}
      />
      <Input
        id={`${prefix}answer`}
        label={`${step + 2}. Correct answer`}
        placeholder="Cahit Arf"
        hint="Capitals and Turkish letters don’t matter. Add other accepted answers with ;"
        maxLength={400}
        value={value.answer}
        error={errors.answer}
        readOnly={readOnly}
        required
        autoComplete="off"
        onChange={(event) => onChange('answer', event.target.value)}
      />
    </>
  )
}
