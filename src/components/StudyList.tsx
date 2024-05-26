import React, { useState, useEffect } from 'react'
import { nanoid } from 'nanoid'
import localforage from 'localforage'

interface StudyItem {
  id: string
  text: string
  completed: boolean
  repetitions: number
  lastCompleted: Date | null
  nextReviewDate: Date
  history: RevisionHistory[]
}

interface RevisionHistory {
  date: string
  action: string
}

const TABS = {
  TODAY: 'Today',
  COMPLETED: 'Completed',
  TO_REVISE: 'What to revise today',
}

const loadInitialData = async (): Promise<StudyItem[]> => {
  try {
    const items = await localforage.getItem<StudyItem[]>('studyItems')
    return items || []
  } catch (error) {
    console.error('Error loading data:', error)
    return []
  }
}

const saveToLocalStorage = async (items: StudyItem[]): Promise<void> => {
  try {
    await localforage.setItem('studyItems', items)
  } catch (error) {
    console.error('Error saving data:', error)
  }
}

const calculateNextReviewDate = (
  lastCompleted: Date,
  repetitions: number
): Date => {
  const intervals = [1, 2, 3, 7]
  const lastCompletedDate = new Date(lastCompleted)
  lastCompletedDate.setDate(
    lastCompletedDate.getDate() + intervals[repetitions - 1]
  )
  return lastCompletedDate
}

const App: React.FC = () => {
  const [items, setItems] = useState<StudyItem[]>([])
  const [newItem, setNewItem] = useState<string>('')
  const [activeTab, setActiveTab] = useState<string>(TABS.TODAY)

  const getFilteredCompletedItems = () => {
    return items.filter((item) => item.completed).reverse()
  }

  const getItemsToRevise = (): StudyItem[] => {
    const now = new Date()
    return items.filter(
      (item) => item.completed && new Date(item.nextReviewDate) <= now
    )
  }

  useEffect(() => {
    const fetchData = async () => {
      const initialData = await loadInitialData()
      setItems(initialData)
    }
    fetchData()
  }, [])

  useEffect(() => {
    saveToLocalStorage(items)
  }, [items])

  const handleAddItem = (): void => {
    if (newItem.trim()) {
      const newStudyItem: StudyItem = {
        id: nanoid(),
        text: newItem,
        completed: false,
        repetitions: 0,
        lastCompleted: null,
        nextReviewDate: new Date(),
        history: [],
      }
      setItems([...items, newStudyItem])
      setNewItem('')
    }
  }

  const handleCompleteItem = (id: string): void => {
    const updatedItems = items.map((item) =>
      item.id === id
        ? {
            ...item,
            completed: true,
            lastCompleted: new Date(),
            nextReviewDate:
              new Date() || calculateNextReviewDate(new Date(), 1),
            repetitions: 1,
            history: [{ date: new Date().toISOString(), action: 'Completed' }],
          }
        : item
    )
    setItems(updatedItems)
  }

  const handleReviseItem = (id: string): void => {
    const updatedItems = items.map((item) => {
      if (item.id === id) {
        const newRepetitions = item.repetitions + 1
        const newNextReviewDate = calculateNextReviewDate(
          new Date(),
          newRepetitions
        )

        return {
          ...item,
          repetitions: newRepetitions,
          lastCompleted: new Date(),
          nextReviewDate: newNextReviewDate,
          history: [
            ...item.history,
            { date: new Date().toISOString(), action: 'Revised' },
          ],
        }
      }
      return item
    })
    setItems(updatedItems)
  }

  const handleClear = (): void => {
    setItems([])
  }

  return (
    <div className="App">
      <header>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <h1>Study To-Do List</h1>
          <div>
            <button onClick={handleClear}>Clear</button>
          </div>
        </div>
        <div className="tabs">
          {Object.values(TABS).map((tab) => (
            <button
              key={tab}
              style={{
                backgroundColor: activeTab === tab ? 'white' : 'black',
                color: activeTab === tab ? 'black' : 'white',
              }}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {activeTab === TABS.TODAY && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <textarea
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="What do you want to study?"
          />
          <div>
            <button onClick={handleAddItem}>Add</button>
          </div>
          <ul>
            {items
              .filter((item) => !item.completed)
              .reverse()
              .map((item) => (
                <li key={item.id}>
                  {item.text}
                  <button onClick={() => handleCompleteItem(item.id)}>
                    Complete
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}

      {activeTab === TABS.COMPLETED && (
        <div>
          <ul>
            {getFilteredCompletedItems().map((item) => (
              <li key={item.id}>
                {item.text} (Revised {item.repetitions} times)
                <ul>
                  {item.history.map((entry, index) => (
                    <li key={index}>
                      {new Date(entry.date).toLocaleDateString()} -{' '}
                      {entry.action}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeTab === TABS.TO_REVISE && (
        <ul>
          {getItemsToRevise()
            .reverse()
            .map((item) => (
              <li key={item.id}>
                {item.text}
                <button onClick={() => handleReviseItem(item.id)}>
                  Revise
                </button>
                <ul>
                  {item.history.map((entry, index) => (
                    <li key={index}>
                      {new Date(entry.date).toLocaleDateString()} -{' '}
                      {entry.action}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
        </ul>
      )}
    </div>
  )
}

export default App
