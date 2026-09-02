"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

export type Locale = "en" | "ru"

const ru: Record<string, string> = {
  "Product context": "Контекст продукта",
  "Demand signals": "Сигналы спроса",
  "Posts": "Публикации",
  "Scan history": "История сканирований",
  "Settings": "Настройки",
  "Workspace": "Рабочее пространство",
  "Switch product": "Переключить продукт",
  "Current": "Текущий",
  "Add product": "Добавить продукт",
  "Workspace navigation": "Навигация рабочего пространства",
  "Demo workspace": "Демо-пространство",
  "Account settings": "Настройки аккаунта",
  "Updated from your last scan · Today, 09:14": "Обновлено после последнего сканирования · Сегодня, 09:14",
  "Demo data": "Демо-данные",
  "Exit demo": "Выйти из демо",
  "Recurring loop": "Регулярный обзор",
  "What changed since you last checked? Pulse turns your scan history into a short, decision-ready read.": "Что изменилось с последней проверки? Pulse превращает историю сканирований в короткую сводку для принятия решений.",
  "This is your first Pulse review for this product.": "Это первый обзор Pulse для этого продукта.",
  "Checkpoint saved": "Отметка сохранена",
  "Saving…": "Сохранение…",
  "Mark as reviewed": "Отметить просмотренным",
  "Could not save the review checkpoint. Try again.": "Не удалось сохранить отметку просмотра. Попробуйте ещё раз.",
  "New demand": "Новый спрос",
  "Rising clusters": "Растущие кластеры",
  "New opportunities": "Новые возможности",
  "Signals acted on": "Обработанные сигналы",
  "Current lookback": "Текущий период",
  "Since your last check": "С последней проверки",
  "First visit · current lookback": "Первый визит · текущий период",
  "Visible actions in this workspace": "Видимые действия в этом пространстве",
  "Demand movement": "Динамика спроса",
  "What changed since your last check": "Что изменилось с последней проверки",
  "Live workspace data": "Актуальные данные пространства",
  "No demand clusters yet. Run a scan to build the first Pulse.": "Кластеров спроса пока нет. Запустите сканирование, чтобы собрать первый Pulse.",
  "Scan health": "Состояние сканирования",
  "No scans yet": "Сканирований пока нет",
  "Latest scan completed. Source-level failures remain visible in scan history.": "Последнее сканирование завершено. Ошибки отдельных источников видны в истории.",
  "Latest scan is still moving through the recurring pipeline.": "Последнее сканирование ещё выполняется.",
  "Run your first scan to see source health.": "Запустите первое сканирование, чтобы увидеть состояние источников.",
  "Recent actions": "Последние действия",
  "No signal actions recorded yet.": "Действий с сигналами пока нет.",
  "Recent posts": "Последние публикации",
  "No posts created yet.": "Публикаций пока нет.",
  "Historical pull": "История данных",
  "Your first scan will start the demand history.": "Первое сканирование начнёт историю спроса.",
  "View scan history": "Открыть историю сканирований",
  "Opportunity queue": "Очередь возможностей",
  "Unmapped demand worth investigating": "Неучтённый спрос, который стоит изучить",
  "No unmapped opportunities in the current lookback.": "В текущем периоде нет неучтённых возможностей.",
  "Demand cluster": "Кластер спроса",
  "Score": "Оценка",
  "Evidence": "Свидетельства",
  "Trend": "Тренд",
  "Match": "Соответствие",
  "Last seen": "Последний сигнал",
  "Expand": "Развернуть",
  "Collapse": "Свернуть",
  "rising": "растёт",
  "falling": "снижается",
  "steady": "стабильно",
  "Existing": "Уже реализовано",
  "Roadmap": "В планах",
  "Unmapped opportunity": "Новая возможность",
  "Open source": "Открыть источник",
  "Suggested action": "Рекомендуемое действие",
  "Public match": "Публичное соответствие",
  "Private roadmap match": "Соответствие приватному плану",
  "Primary analytics": "Основная аналитика",
  "One row is one demand cluster—not one URL. Expand a cluster to inspect provenance, matching rationale, and the action it suggests.": "Одна строка — один кластер спроса, а не один URL. Разверните кластер, чтобы увидеть источники, логику сопоставления и рекомендуемое действие.",
  "Clusters": "Кластеры",
  "Rising": "Растущие",
  "Unmapped": "Неучтённые",
  "Needs review": "Требуют внимания",
  "Sorted by signal strength": "По силе сигнала",
  "Filter by lookback": "Фильтр по периоду",
  "Last 7 days": "Последние 7 дней",
  "Last 30 days": "Последние 30 дней",
  "Last 90 days": "Последние 90 дней",
  "Run now": "Запустить",
  "Scan queued": "Сканирование в очереди",
  "Scanning…": "Сканирование…",
  "Retry scan": "Повторить сканирование",
  "Recurring research": "Регулярное исследование",
  "Manual and scheduled scans share one pipeline. Review what ran, which sources succeeded, and how raw evidence became clusters.": "Ручные и запланированные сканирования используют один процесс. Проверьте запуск, успешные источники и формирование кластеров.",
  "Last run": "Последний запуск",
  "No runs yet": "Запусков пока нет",
  "Sources": "Источники",
  "Last completed attempt": "Последняя завершённая попытка",
  "Date": "Дата",
  "Status": "Статус",
  "Duration": "Длительность",
  "Signals": "Сигналы",
  "Completed": "Завершено",
  "Partial": "Частично",
  "Each run preserves start/end time, source outcomes, raw evidence count, cluster count, and errors for review.": "Каждый запуск сохраняет время начала и окончания, результаты источников, число исходных сигналов, кластеров и ошибок.",
  "Workspace configuration": "Настройка пространства",
  "Choose where Demand Radar looks, how often it checks, and how generated writing should sound on each platform.": "Выберите, где Demand Radar ищет сигналы, как часто проверяет источники и как должен звучать текст для каждой платформы.",
  "Scheduled scanning": "Сканирование по расписанию",
  "Enable recurring scans": "Включить регулярные сканирования",
  "Frequency": "Частота",
  "Every day": "Каждый день",
  "Every week": "Каждую неделю",
  "Manual only": "Только вручную",
  "Execution time": "Время запуска",
  "Timezone": "Часовой пояс",
  "Lookback period": "Период анализа",
  "Source pool": "Набор источников",
  "Public, no login": "Публичный, вход не нужен",
  "Social profiles": "Социальные профили",
  "Additional writing instructions": "Дополнительные инструкции для текста",
  "Settings saved": "Настройки сохранены",
  "Unsaved changes": "Несохранённые изменения",
  "Save settings": "Сохранить настройки",
  "Demo configuration": "Демо-конфигурация",
  "Built for a recurring loop": "Создано для регулярной работы",
  "Product model": "Модель продукта",
  "The shared model behind every demand match. Keep what is public, what is planned, and what is still just a thought in one editable place.": "Общая модель для всех сопоставлений спроса. Храните публичное, запланированное и ранние идеи в одном редактируемом месте.",
  "Last analyzed today": "Последний анализ сегодня",
  "Draft studio": "Редактор черновиков",
  "Turn a useful demand signal into a clear public contribution. Edit the draft inline, preview AI rewrites, and keep platform constraints visible.": "Превратите полезный сигнал спроса в понятную публикацию. Редактируйте черновик, сравнивайте варианты ИИ и учитывайте ограничения платформы.",
  "No post drafts yet. Create one from a demand cluster.": "Черновиков пока нет. Создайте первый из кластера спроса.",
  "Saved just now": "Только что сохранено",
  "Save draft": "Сохранить черновик",
  "Publish later": "Опубликовать позже",
  "Rewrite with AI": "Переписать с ИИ",
  "Direction": "Направление",
  "Custom instruction": "Своя инструкция",
  "Shorter": "Короче",
  "Stronger": "Убедительнее",
  "Rewrite preview": "Предпросмотр варианта",
  "Platform constraints": "Ограничения платформы",
  "Channel": "Канал",
  "Tone": "Тон",
  "Remaining": "Осталось",
  "Public product URL": "Публичный URL продукта",
  "Positioning": "Позиционирование",
  "Ideal customer profile": "Портрет идеального клиента",
  "Problems solved": "Решаемые проблемы",
  "Public capabilities": "Публичные возможности",
  "Differentiators": "Отличия",
  "Private roadmap": "Приватный план",
  "Relevant keywords": "Релевантные ключевые слова",
  "Private": "Приватно",
  "All changes saved": "Все изменения сохранены",
  "Save context": "Сохранить контекст",
  "Clear context": "Очистить контекст",
  "AI-assisted editing": "Редактирование с ИИ",
  "Weighted from volume, source diversity, recency, momentum, and normalized engagement.": "Взвешено по объёму, разнообразию источников, давности, динамике и нормализованной вовлечённости.",
  "Deterministic score explanation is available after the next scan.": "Детерминированное объяснение оценки появится после следующего сканирования.",
  "The clearest sentence describing why this product exists.": "Самая ясная фраза о том, зачем существует этот продукт.",
  "Who gets the most value from this product.": "Кто получает от продукта наибольшую пользу.",
  "What your product helps someone do or avoid.": "Что продукт помогает сделать или предотвратить.",
  "Only functionality users can access today.": "Только функции, доступные пользователям сегодня.",
  "Public reasons to choose this product.": "Публичные причины выбрать этот продукт.",
  "Kept private and used only for internal classification.": "Хранится приватно и используется только для внутренней классификации.",
  "Terms and concepts that help source adapters find useful evidence.": "Термины и понятия, которые помогают источникам находить полезные свидетельства.",
  "item": "элемент",
  "Delete": "Удалить",
  "Add": "Добавить",
}

type I18nValue = { locale: Locale; setLocale: (locale: Locale) => void; t: (value: string) => string }
const I18nContext = createContext<I18nValue>({ locale: "en", setLocale: () => undefined, t: (text) => text })

export function translate(locale: Locale, text: string) {
  if (locale !== "ru") return text
  const sourceCount = /^(\d+) sources$/.exec(text)
  if (sourceCount) return `${sourceCount[1]} источников`
  const opportunityCount = /^(\d+) high-confidence opportunities$/.exec(text)
  if (opportunityCount) return `${opportunityCount[1]} возможностей с высокой уверенностью`
  const signalSummary = /^(\d+) clusters · (\d+) independent signals · (\d+) sources$/.exec(text)
  if (signalSummary) return `${signalSummary[1]} кластеров · ${signalSummary[2]} независимых сигналов · ${signalSummary[3]} источников`
  return ru[text] ?? text
}

export function LocaleProvider({ initialLocale, children }: { initialLocale: Locale; children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const value = useMemo<I18nValue>(() => ({
    locale,
    setLocale(nextLocale) {
      document.cookie = `demand-radar-locale=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`
      setLocaleState(nextLocale)
      document.documentElement.lang = nextLocale
    },
    t: (text) => translate(locale, text),
  }), [locale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useLocale() {
  return useContext(I18nContext)
}

export function LocalizedText({ text }: { text: string }) {
  const { t } = useLocale()
  return <>{t(text)}</>
}
