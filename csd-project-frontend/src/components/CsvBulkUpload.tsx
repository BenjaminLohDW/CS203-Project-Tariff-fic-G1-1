import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Upload, Download, AlertCircle, CheckCircle2, FileText } from 'lucide-react'
import adminTariffService, { type CsvUploadResult, type CsvUploadError } from '@/lib/adminTariffService'

interface CsvBulkUploadProps {
  onUploadComplete: () => void
}

export function CsvBulkUpload({ onUploadComplete }: CsvBulkUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<string[][]>([])
  const [uploadResult, setUploadResult] = useState<CsvUploadResult | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [lastUploadTime, setLastUploadTime] = useState<number>(0)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Security: Validate file type (extension check)
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      alert('Security: Only CSV files are allowed')
      return
    }

    // Security: Validate MIME type
    if (selectedFile.type && !['text/csv', 'application/vnd.ms-excel', 'text/plain'].includes(selectedFile.type)) {
      alert('Security: Invalid file type. Only CSV files are allowed.')
      return
    }

    // Security: Validate file size (max 2MB to prevent DoS)
    const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
    if (selectedFile.size > MAX_FILE_SIZE) {
      alert(`Security: File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`)
      return
    }

    // Security: Validate filename (no path traversal characters)
    if (/[\/\\]/.test(selectedFile.name)) {
      alert('Security: Invalid filename')
      return
    }

    setFile(selectedFile)
    setUploadResult(null)

    // Parse CSV for preview
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      
      // Security: Validate content size after reading
      if (text.length > 5 * 1024 * 1024) { // 5MB as text
        alert('Security: File content too large')
        setFile(null)
        return
      }
      
      // Security: Basic validation for CSV injection
      const dangerousPatterns = /<script|javascript:|onerror=|onclick=/i
      if (dangerousPatterns.test(text)) {
        alert('Security: File contains potentially dangerous content')
        setFile(null)
        return
      }
      
      const rows = text.split('\n').filter(line => line.trim()).map(row => {
        // Parse CSV line handling quoted fields and empty fields
        const result: string[] = []
        let current = ''
        let inQuotes = false
        
        for (let i = 0; i < row.length; i++) {
          const char = row[i]
          
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        result.push(current.trim())
        
        return result
      })
      
      // Security: Limit preview rows to prevent UI DoS
      const MAX_PREVIEW_ROWS = 11 // Header + 10 data rows
      setPreviewData(rows.slice(0, MAX_PREVIEW_ROWS))
    }
    
    reader.onerror = () => {
      alert('Error reading file')
      setFile(null)
    }
    
    reader.readAsText(selectedFile)
  }

  const handleUpload = async () => {
    if (!file) return

    // Security: Rate limiting - prevent rapid successive uploads
    const now = Date.now()
    const RATE_LIMIT_MS = 10000 // 10 seconds between uploads
    if (now - lastUploadTime < RATE_LIMIT_MS) {
      const waitTime = Math.ceil((RATE_LIMIT_MS - (now - lastUploadTime)) / 1000)
      alert(`Security: Please wait ${waitTime} seconds before uploading again`)
      return
    }

    setIsUploading(true)
    setUploadProgress({ current: 0, total: previewData.length - 1 })
    
    try {
      const result = await adminTariffService.bulkUploadTariffs(file, (current, total) => {
        setUploadProgress({ current, total })
      })
      
      setUploadResult(result)
      setLastUploadTime(Date.now()) // Update last upload time
      
      if (result.successful > 0 || result.updated > 0) {
        onUploadComplete() // Refresh the tariff list
      }
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Upload failed. Please check the console for details.')
    } finally {
      setIsUploading(false)
      setUploadProgress({ current: 0, total: 0 })
    }
  }

  const downloadTemplate = () => {
    const template = `hsCode,importerId,exporterId,tariffType,tariffRate,specificAmt,specificUnit,effectiveDate,expiryDate
010121,US,CN,Ad Valorem,0.155,,,2024-01-01,2034-01-01
020110,US,MX,Specific,,5.50,USD/kg,2024-01-01,2034-01-01
030111,US,CA,Compound,0.10,2.25,USD/kg,2024-01-01,2034-01-01`

    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'tariff_upload_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadErrorReport = () => {
    if (!uploadResult?.errors?.length) return

    // Security: Sanitize CSV cells to prevent formula injection
    const sanitizeCell = (cell: string): string => {
      if (!cell) return ''
      const cellStr = String(cell)
      // Prefix dangerous characters that could be interpreted as formulas
      if (/^[=+\-@\t\r]/.test(cellStr)) {
        return `'${cellStr}` // Single quote prevents formula execution
      }
      // Escape quotes
      return cellStr.replace(/"/g, '""')
    }

    const errorCsv = [
      'Row,Error,Data',
      ...uploadResult.errors.map((err: CsvUploadError) => 
        `${sanitizeCell(String(err.row))},"${sanitizeCell(err.error)}","${sanitizeCell(err.data)}"`
      )
    ].join('\n')

    const blob = new Blob([errorCsv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `upload_errors_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Upload Tariffs via CSV</CardTitle>
        <CardDescription>
          Upload multiple tariff entries at once. Duplicate entries (same HS Code, Importer, Exporter, and Effective Date) will be updated with new rates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Download Template */}
        <div className="flex items-center gap-2">
          <Button onClick={downloadTemplate} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Download CSV Template
          </Button>
          <span className="text-sm text-gray-500">
            Use this template to format your data correctly
          </span>
        </div>

        {/* File Upload */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Select CSV File</label>
          <Input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={isUploading}
          />
          <p className="text-xs text-gray-500">
            Max file size: 5MB. Format: hsCode, importerId, exporterId, tariffType, tariffRate, specificAmt, specificUnit, effectiveDate, expiryDate
          </p>
        </div>

        {/* Preview Table */}
        {previewData.length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Preview (First 10 rows)
            </label>
            <div className="border rounded-md overflow-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {previewData[0]?.map((header, idx) => (
                      <th key={idx} className="px-3 py-2 text-left font-medium">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(1).map((row, rowIdx) => (
                    <tr key={rowIdx} className="border-t">
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx} className="px-3 py-2">
                          {cell || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Upload Button */}
        <div className="space-y-2">
          <Button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:text-gray-500"
          >
            {isUploading ? (
              <>
                <FileText className="mr-2 h-4 w-4 animate-pulse" />
                Uploading... {uploadProgress.current}/{uploadProgress.total}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {file ? 'Upload' : 'Select a CSV file to upload'}
              </>
            )}
          </Button>
          
          {/* Progress Bar */}
          {isUploading && uploadProgress.total > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Upload Result */}
        {uploadResult && (
          <div className="space-y-3 border-t pt-4">
            <h3 className="font-medium">Upload Results</h3>
            
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-3 bg-green-50 border border-green-200 rounded">
                <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-green-700">{uploadResult.successful}</div>
                <div className="text-xs text-green-600">Successful</div>
              </div>
              
              <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded">
                <FileText className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-blue-700">{uploadResult.updated}</div>
                <div className="text-xs text-blue-600">Updated</div>
              </div>
              
              <div className="text-center p-3 bg-gray-50 border border-gray-200 rounded">
                <FileText className="h-6 w-6 text-gray-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-gray-700">{uploadResult.skipped}</div>
                <div className="text-xs text-gray-600">Skipped</div>
              </div>
              
              <div className="text-center p-3 bg-red-50 border border-red-200 rounded">
                <AlertCircle className="h-6 w-6 text-red-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-red-700">{uploadResult.failed}</div>
                <div className="text-xs text-red-600">Failed</div>
              </div>
            </div>

            {uploadResult.errors && uploadResult.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-red-600">
                    {uploadResult.errors.length} Error(s) Found
                  </span>
                  <Button onClick={downloadErrorReport} variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Download Error Report
                  </Button>
                </div>
                
                <div className="max-h-40 overflow-auto border rounded p-2 bg-red-50">
                  {uploadResult.errors.slice(0, 5).map((err: CsvUploadError, idx: number) => (
                    <div key={idx} className="text-xs text-red-700 mb-1">
                      Row {err.row}: {err.error}
                    </div>
                  ))}
                  {uploadResult.errors.length > 5 && (
                    <div className="text-xs text-red-600 italic">
                      ... and {uploadResult.errors.length - 5} more errors (download report for full list)
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
