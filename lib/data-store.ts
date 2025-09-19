import { promises as fs } from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
  }
}

// Generic data store functions
export async function readData<T>(filename: string): Promise<T[]> {
  await ensureDataDir()
  const filePath = path.join(DATA_DIR, `${filename}.json`)

  try {
    const data = await fs.readFile(filePath, "utf-8")
    return JSON.parse(data)
  } catch {
    return []
  }
}

export async function writeData<T>(filename: string, data: T[]): Promise<void> {
  await ensureDataDir()
  const filePath = path.join(DATA_DIR, `${filename}.json`)
  await fs.writeFile(filePath, JSON.stringify(data, null, 2))
}

export async function addRecord<T extends { id: string }>(filename: string, record: T): Promise<T> {
  const data = await readData<T>(filename)
  data.push(record)
  await writeData(filename, data)
  return record
}

export async function updateRecord<T extends { id: string }>(
  filename: string,
  id: string,
  updates: Partial<T>,
): Promise<T | null> {
  const data = await readData<T>(filename)
  const index = data.findIndex((item) => item.id === id)

  if (index === -1) return null

  data[index] = { ...data[index], ...updates }
  await writeData(filename, data)
  return data[index]
}

export async function deleteRecord<T extends { id: string }>(filename: string, id: string): Promise<boolean> {
  const data = await readData<T>(filename)
  const filteredData = data.filter((item) => item.id !== id)

  if (filteredData.length === data.length) return false

  await writeData(filename, filteredData)
  return true
}
