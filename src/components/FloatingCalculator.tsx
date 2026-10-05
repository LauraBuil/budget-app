import { Calculator, Delete, Equal, X } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../context/AppContext'

type Operator = '+' | '−' | '×' | '÷'

export function FloatingCalculator() {
  const { t } = useApp()
  const [open, setOpen] = useState(false)
  const [display, setDisplay] = useState('0')
  const [stored, setStored] = useState<number | null>(null)
  const [operator, setOperator] = useState<Operator | null>(null)
  const [waiting, setWaiting] = useState(false)

  function reset() { setDisplay('0'); setStored(null); setOperator(null); setWaiting(false) }
  function digit(value: string) { setDisplay((current) => waiting || current === '0' ? value : `${current}${value}`); setWaiting(false) }
  function decimal() { if (waiting) { setDisplay('0.'); setWaiting(false) } else if (!display.includes('.')) setDisplay(`${display}.`) }
  function calculate(left: number, right: number, action: Operator) {
    if (action === '+') return left + right
    if (action === '−') return left - right
    if (action === '×') return left * right
    return right === 0 ? 0 : left / right
  }
  function chooseOperator(next: Operator) {
    const value = Number(display)
    if (stored !== null && operator && !waiting) setDisplay(String(calculate(stored, value, operator)))
    setStored(stored === null || !operator || waiting ? value : calculate(stored, value, operator))
    setOperator(next)
    setWaiting(true)
  }
  function equals() {
    if (stored === null || !operator) return
    setDisplay(String(calculate(stored, Number(display), operator)))
    setStored(null); setOperator(null); setWaiting(true)
  }
  function percent() { setDisplay(String(Number(display) / 100)); setWaiting(false) }
  function backspace() { setDisplay((current) => current.length > 1 ? current.slice(0, -1) : '0') }

  return <div className="calculator-widget"><button className="calculator-trigger" type="button" onClick={() => setOpen((current) => !current)} aria-label={t('calculator')}><Calculator size={19}/></button>{open && <section className="calculator-panel" aria-label={t('calculator')}><header><strong>{t('calculator')}</strong><button type="button" onClick={() => setOpen(false)} aria-label={t('close')}><X size={17}/></button></header><output>{display}</output><div className="calculator-keys"><button type="button" onClick={reset}>AC</button><button type="button" onClick={backspace}><Delete size={16}/></button><button type="button" onClick={percent}>%</button><button type="button" className="calculator-key--operator" onClick={() => chooseOperator('÷')}>÷</button>{['7','8','9'].map((value) => <button type="button" key={value} onClick={() => digit(value)}>{value}</button>)}<button type="button" className="calculator-key--operator" onClick={() => chooseOperator('×')}>×</button>{['4','5','6'].map((value) => <button type="button" key={value} onClick={() => digit(value)}>{value}</button>)}<button type="button" className="calculator-key--operator" onClick={() => chooseOperator('−')}>−</button>{['1','2','3'].map((value) => <button type="button" key={value} onClick={() => digit(value)}>{value}</button>)}<button type="button" className="calculator-key--operator" onClick={() => chooseOperator('+')}>+</button><button type="button" className="calculator-key--wide" onClick={() => digit('0')}>0</button><button type="button" onClick={decimal}>.</button><button type="button" className="calculator-key--equals" onClick={equals}><Equal size={17}/></button></div></section>}</div>
}
