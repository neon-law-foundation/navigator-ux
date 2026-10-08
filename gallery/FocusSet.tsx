import { useState, type ComponentType, type ReactNode } from 'react'

import { FIRM } from '../fixtures/matter.mjs'
import {
  ChoiceGroup,
  Hero,
  Icon,
  NavLinkButton,
  Stage,
  StepList,
  Stepper,
  TextField,
} from '../src/index'

/*
 * The focus set, illustrated. Each `Stage` sits in a `.gallery__stage` frame
 * that caps its height, or it would claim the viewport. The specimen data is
 * invented.
 */

interface SectionProps {
  title: string
  note?: ReactNode
  children: ReactNode
}

const PRACTICE_AREAS = [
  {
    value: 'company',
    label: 'Form a company',
    description: 'An LLC or a corporation, with a registered agent and an operating agreement.',
  },
  {
    value: 'estate',
    label: 'Plan an estate',
    description: 'A living trust or a will, and the documents that fund it.',
  },
  {
    value: 'eviction',
    label: 'Answer an eviction notice',
    description: 'A response filed on time, and someone at the hearing with you.',
  },
  {
    value: 'other',
    label: 'Something else',
    description: 'Tell us in a sentence. A lawyer reads every one.',
  },
]

const ALREADY_HAVE = [
  { value: 'name', label: 'A name in mind' },
  { value: 'owners', label: 'Other owners' },
  { value: 'ein', label: 'An EIN' },
  { value: 'none', label: 'None of these yet' },
]

export function FocusSet({ Section }: { Section: ComponentType<SectionProps> }) {
  const [step, setStep] = useState(0)
  const [need, setNeed] = useState<string[]>([])
  const [done, setDone] = useState(false)

  return (
    <>
      <Section
        title="One thing at a time"
        note={"Stage, Stepper, and ChoiceGroup together: an intake that asks one question per screen, centered in the viewport. Press Continue."}
      >
        <div className="gallery__stage">
          <Stage
            width="md"
            header={<p className="gallery__stage-brand">{FIRM}</p>}
            footer={
              <p>
                Nothing here is legal advice, and nothing you enter is shared until you ask us to
                start a matter.
              </p>
            }
          >
            {done ? (
              <Hero
                level={2}
                eyebrow="Received"
                title="A lawyer will read this today."
                lede="You will hear from us by email before the end of the next business day, with a flat fee and the first step."
                actions={
                  <NavLinkButton
                    variant="outline"
                    size="lg"
                    href="#one-thing-at-a-time"
                    onClick={(event) => {
                      event.preventDefault()
                      setDone(false)
                      setStep(0)
                    }}
                  >
                    Start over
                  </NavLinkButton>
                }
              />
            ) : (
              <Stepper
                label="Intake progress"
                current={step}
                onCurrentChange={setStep}
                canAdvance={step !== 0 || need.length > 0}
                onComplete={() => setDone(true)}
                labels={{ finish: 'Send to a lawyer' }}
                steps={[
                  {
                    id: 'need',
                    title: 'What do you need?',
                    description: 'Pick the closest one. You can change it later.',
                    children: (
                      <ChoiceGroup
                        legend="What do you need?"
                        legendHidden
                        name="need"
                        choices={PRACTICE_AREAS}
                        onValueChange={setNeed}
                        required
                      />
                    ),
                  },
                  {
                    id: 'have',
                    title: 'What do you have?',
                    description: 'Check everything that applies. It changes what we send you first.',
                    children: (
                      <ChoiceGroup
                        legend="What do you have?"
                        legendHidden
                        name="have"
                        choices={ALREADY_HAVE}
                        multiple
                        columns={2}
                      />
                    ),
                  },
                  {
                    id: 'you',
                    title: 'How do we reach you?',
                    description: 'One email, from a lawyer, within a business day.',
                    children: (
                      <>
                        <TextField label="Full name" name="name" autoComplete="name" required />
                        <TextField
                          label="Email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          help="We only use this to reply."
                          required
                        />
                      </>
                    ),
                  },
                ]}
              />
            )}
          </Stage>
        </div>
      </Section>

      <Section
        title="Hero"
        note={"The big type block on a wide stage, with the large buttons."}
      >
        <div className="gallery__stage gallery__stage--short">
          <Stage width="lg">
            <Hero
              level={2}
              eyebrow="Business formation"
              title="Start your company this week."
              lede="One flat fee, one conversation, and every filing handled by a lawyer who will still be here next year."
              actions={
                <>
                  <NavLinkButton variant="primary" size="lg" href="#hero">
                    Start a matter
                  </NavLinkButton>
                  <NavLinkButton variant="outline" size="lg" href="#hero">
                    Book a call
                  </NavLinkButton>
                </>
              }
            />
          </Stage>
        </div>
      </Section>

      <Section
        title="ChoiceGroup"
        note={"RadioGroup's options grown to cards, in two columns; the second group is the invalid state."}
      >
        <div className="gallery__grid">
          <ChoiceGroup
            legend="Who owns the company?"
            name="owners"
            columns={2}
            defaultValue="me"
            choices={[
              { value: 'me', label: 'Just me', icon: <Icon name="star-fill" /> },
              { value: 'us', label: 'Two or more of us', icon: <Icon name="diagram-3-fill" /> },
              { value: 'entity', label: 'Another company', icon: <Icon name="shield-fill-check" /> },
              { value: 'unsure', label: 'Not sure yet', icon: <Icon name="eye" />, disabled: true },
            ]}
            help="Pick the one that is true today."
          />
          <ChoiceGroup
            legend="How should we send documents?"
            name="delivery"
            multiple
            choices={[
              { value: 'portal', label: 'In the portal', description: 'Signed and stored with the matter.' },
              { value: 'email', label: 'By email', description: 'A PDF, to the address above.' },
            ]}
            error="Choose at least one."
          />
        </div>
      </Section>

      <Section
        title="StepList"
        note={"The stepper's rail on its own, with a completed step, the current one, and three to come."}
      >
        <StepList
          label="Matter progress"
          current={2}
          steps={[
            { id: 'engage', title: 'Engagement letter' },
            { id: 'questions', title: 'Questionnaire' },
            { id: 'draft', title: 'Draft review' },
            { id: 'sign', title: 'Signatures' },
            { id: 'file', title: 'Filing' },
          ]}
        />
      </Section>
    </>
  )
}
