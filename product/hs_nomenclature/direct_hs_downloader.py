#!/usr/bin/env python3
"""
Direct HS Nomenclature PDF Downloader
=====================================

Downloads HS nomenclature PDFs directly from WCO using URL pattern construction.
Much more efficient than web scraping!

URL Pattern: 
https://www.wcoomd.org/-/media/wco/public/global/pdf/topics/nomenclature/instruments-and-tools/hs-nomenclature-2022/2022/{CCSS}_2022e.pdf

Incrementation Logic:
- Start: 0101, 0102, 0103, ... until 404 error
- When 404 found (e.g., at 0106), jump to next chapter with same suffix: 0206
- Continue: 0206, 0207, 0208, ... until next 404
- Jump again: 0308, 0309, ... and so on

Requirements:
- pip install requests

Usage:
    python direct_hs_downloader.py
    python direct_hs_downloader.py --max-chapters 20
    python direct_hs_downloader.py --start-code 0201 --output-dir my_data

Author: Assistant
Date: 2025-09-28
"""

import requests
import os
import time
import logging
import argparse
import json
from typing import List, Dict, Tuple, Optional

class DirectHSDownloader:
    """
    Direct HS PDF downloader using smart URL pattern construction
    """
    
    def __init__(self, output_dir: str = "hs_nomenclature_data"):
        self.output_dir = output_dir
        self.pdf_dir = os.path.join(output_dir, "pdfs")
        self.csv_dir = os.path.join(output_dir, "csvs")
        
        # Create directories
        os.makedirs(self.pdf_dir, exist_ok=True)
        os.makedirs(self.csv_dir, exist_ok=True)
        
        # URL pattern
        self.base_url = "https://www.wcoomd.org/-/media/wco/public/global/pdf/topics/nomenclature/instruments-and-tools/hs-nomenclature-2022/2022/{chapter_code}_2022e.pdf?la=en"
        
        # Setup session
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive'
        })
        
        # Setup logging
        log_file = os.path.join(output_dir, 'download.log')
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
        
        # Results tracking
        self.found_chapters: List[str] = []
        self.missing_chapters: List[str] = []
        self.download_stats = {
            'total_checked': 0,
            'total_found': 0,
            'total_downloaded': 0,
            'total_failed': 0,
            'total_bytes': 0
        }
    
    def check_chapter_exists(self, chapter_code: str, timeout: int = 15) -> Tuple[bool, str, int]:
        """
        Check if a chapter PDF exists by testing the URL
        
        Returns:
            (exists, url, file_size)
        """
        url = self.base_url.format(chapter_code=chapter_code)
        
        try:
            response = self.session.head(url, timeout=timeout)
            self.download_stats['total_checked'] += 1
            
            if response.status_code == 200:
                content_length = int(response.headers.get('content-length', 0))
                
                # # Validate file size (HS PDFs should be at least 10KB)
                # if content_length >= 10000:
                return True, url, content_length
                # else:
                #     self.logger.debug(f"{chapter_code}: File too small ({content_length} bytes)")
                #     return False, url, content_length
                    
            elif response.status_code == 404:
                self.logger.debug(f"{chapter_code}: Not found (404)")
                return False, url, 0
            else:
                self.logger.debug(f"{chapter_code}: HTTP {response.status_code}")
                return False, url, 0
                
        except requests.exceptions.Timeout:
            self.logger.warning(f"{chapter_code}: Request timeout")
            return False, url, 0
        except Exception as e:
            self.logger.debug(f"{chapter_code}: Error - {e}")
            return False, url, 0
    
    def discover_all_chapters(self, start_code: str = "0101", max_chapters: Optional[int] = None) -> List[Dict]:
        """
        Discover all available chapters using smart incrementation
        
        Args:
            start_code: Starting chapter code (e.g., "0101")
            max_chapters: Maximum chapters to find (None for unlimited)
            
        Returns:
            List of chapter info dictionaries
        """
        self.logger.info(f"Starting chapter discovery from {start_code}")
        self.logger.info(f"URL pattern: {self.base_url}")
        
        found_chapters = []
        
        # Parse starting code
        chapter_num = int(start_code[:2])
        suffix_num = int(start_code[2:])
        
        consecutive_chapter_failures = 0
        max_consecutive_chapter_failures = 5  # Stop after 5 consecutive chapter failures
        
        while chapter_num <= 97:  # HS codes go up to chapter 97
            if max_chapters and len(found_chapters) >= max_chapters:
                self.logger.info(f"Reached max chapters limit: {max_chapters}")
                break
            
            chapter_code = f"{chapter_num:02d}{suffix_num:02d}"
            
            self.logger.info(f"Checking {chapter_code}... [{len(found_chapters)} found so far]")
            
            exists, url, file_size = self.check_chapter_exists(chapter_code)
            
            if exists:
                # Chapter found!
                chapter_info = {
                    'chapter_code': chapter_code,
                    'chapter_num': chapter_num,
                    'suffix_num': suffix_num,
                    'url': url,
                    'file_size': file_size,
                    'filename': f"{chapter_code}_2022e.pdf"
                }
                
                found_chapters.append(chapter_info)
                self.found_chapters.append(chapter_code)
                self.download_stats['total_found'] += 1
                
                self.logger.info(f"✅ Found: {chapter_code} ({file_size:,} bytes)")
                
                # Continue with next suffix in same chapter
                suffix_num += 1
                consecutive_chapter_failures = 0
                
            else:
                # Chapter not found - move to next chapter with same suffix
                self.missing_chapters.append(chapter_code)
                
                self.logger.debug(f"❌ Missing: {chapter_code}")
                
                # Move to next chapter, keep same suffix
                chapter_num += 1
                consecutive_chapter_failures += 1
                
                if consecutive_chapter_failures >= max_consecutive_chapter_failures:
                    self.logger.info(f"Stopping: {consecutive_chapter_failures} consecutive chapter failures")
                    break
                
                self.logger.debug(f"→ Moving to Chapter {chapter_num:02d}, suffix {suffix_num:02d}")
            
            # Small delay to be respectful
            time.sleep(0.2)
        
        self.logger.info(f"Discovery complete!")
        self.logger.info(f"Total found: {len(found_chapters)} chapters")
        self.logger.info(f"Total checked: {self.download_stats['total_checked']} URLs")
        
        return found_chapters
    
    def download_pdf(self, chapter_info: Dict, max_retries: int = 3) -> Optional[str]:
        """
        Download a single PDF file
        
        Args:
            chapter_info: Chapter information dictionary
            max_retries: Maximum retry attempts
            
        Returns:
            Downloaded file path or None if failed
        """
        filename = chapter_info['filename']
        filepath = os.path.join(self.pdf_dir, filename)
        
        # Check if already downloaded
        if os.path.exists(filepath):
            existing_size = os.path.getsize(filepath)
            expected_size = chapter_info['file_size']
            
            if existing_size >= expected_size * 0.95:  # Allow 5% variance
                self.logger.info(f"Already downloaded: {filename}")
                return filepath
            else:
                self.logger.info(f"Re-downloading (size mismatch): {filename}")
                os.remove(filepath)
        
        url = chapter_info['url']
        
        for attempt in range(max_retries):
            try:
                self.logger.info(f"Downloading {filename} (attempt {attempt + 1}/{max_retries})")
                
                response = self.session.get(url, timeout=120, stream=True)
                response.raise_for_status()
                
                # Validate content type
                content_type = response.headers.get('content-type', '').lower()
                if 'pdf' not in content_type and 'application' not in content_type:
                    self.logger.warning(f"Unexpected content type: {content_type} for {filename}")
                
                # Download file
                with open(filepath, 'wb') as f:
                    downloaded_bytes = 0
                    for chunk in response.iter_content(chunk_size=8192):
                        if chunk:
                            f.write(chunk)
                            downloaded_bytes += len(chunk)
                
                # Validate downloaded file
                file_size = os.path.getsize(filepath)
                expected_size = chapter_info['file_size']
                
                if file_size >= expected_size * 0.9:  # Allow 10% variance
                    self.logger.info(f"✅ Downloaded: {filename} ({file_size:,} bytes)")
                    self.download_stats['total_downloaded'] += 1
                    self.download_stats['total_bytes'] += file_size
                    return filepath
                else:
                    self.logger.warning(f"Size mismatch: {filename} (got {file_size}, expected {expected_size})")
                    if attempt < max_retries - 1:
                        os.remove(filepath)
                        
            except Exception as e:
                self.logger.error(f"Attempt {attempt + 1} failed for {filename}: {e}")
                if attempt < max_retries - 1:
                    time.sleep(3 * (attempt + 1))  # Progressive delay
        
        self.logger.error(f"❌ Failed to download: {filename}")
        self.download_stats['total_failed'] += 1
        return None
    
    def save_discovery_results(self, chapters: List[Dict]) -> str:
        """Save discovery results to JSON for inspection"""
        results = {
            'total_chapters_found': len(chapters),
            'total_urls_checked': self.download_stats['total_checked'],
            'found_chapters': self.found_chapters,
            'missing_chapters': self.missing_chapters,
            'chapters_detail': chapters,
            'discovery_timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
        }
        
        results_file = os.path.join(self.output_dir, 'discovery_results.json')
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        self.logger.info(f"Discovery results saved to: {results_file}")
        return results_file
    
    def run_complete_download(self, 
                            start_code: str = "0101", 
                            max_chapters: Optional[int] = None,
                            download_delay: float = 1.0) -> Dict:
        """
        Run complete discovery and download process
        
        Args:
            start_code: Starting chapter code
            max_chapters: Maximum chapters to process
            download_delay: Delay between downloads (seconds)
            
        Returns:
            Results dictionary
        """
        start_time = time.time()
        
        self.logger.info("=" * 60)
        self.logger.info("DIRECT HS NOMENCLATURE PDF DOWNLOADER")
        self.logger.info("=" * 60)
        self.logger.info(f"Start code: {start_code}")
        self.logger.info(f"Max chapters: {max_chapters or 'unlimited'}")
        self.logger.info(f"Output directory: {self.output_dir}")
        
        # Phase 1: Discovery
        self.logger.info("\\n" + "=" * 40)
        self.logger.info("PHASE 1: DISCOVERING CHAPTERS")
        self.logger.info("=" * 40)
        
        chapters = self.discover_all_chapters(start_code, max_chapters)
        
        if not chapters:
            self.logger.error("No chapters discovered! Exiting.")
            return {'success': False, 'error': 'No chapters found'}
        
        # Save discovery results
        self.save_discovery_results(chapters)
        
        # Phase 2: Download
        self.logger.info("\\n" + "=" * 40)
        self.logger.info("PHASE 2: DOWNLOADING PDFS")
        self.logger.info("=" * 40)
        
        successful_downloads = []
        failed_downloads = []
        
        for i, chapter_info in enumerate(chapters):
            self.logger.info(f"[{i+1}/{len(chapters)}] Processing {chapter_info['chapter_code']}")
            
            filepath = self.download_pdf(chapter_info)
            
            if filepath:
                successful_downloads.append({
                    'chapter_code': chapter_info['chapter_code'],
                    'filename': chapter_info['filename'],
                    'filepath': filepath,
                    'file_size': os.path.getsize(filepath)
                })
            else:
                failed_downloads.append(chapter_info)
            
            # Delay between downloads
            if i < len(chapters) - 1:  # Not the last one
                time.sleep(download_delay)
        
        # Final results
        total_time = time.time() - start_time
        
        results = {
            'success': True,
            'total_runtime_seconds': total_time,
            'chapters_discovered': len(chapters),
            'successful_downloads': len(successful_downloads),
            'failed_downloads': len(failed_downloads),
            'total_bytes_downloaded': self.download_stats['total_bytes'],
            'download_stats': self.download_stats,
            'found_chapters': self.found_chapters,
            'successful_files': [d['filename'] for d in successful_downloads],
            'output_directory': self.output_dir
        }
        
        # Summary
        self.logger.info("\\n" + "=" * 60)
        self.logger.info("DOWNLOAD COMPLETE!")
        self.logger.info("=" * 60)
        self.logger.info(f"Total runtime: {total_time:.1f} seconds")
        self.logger.info(f"Chapters discovered: {len(chapters)}")
        self.logger.info(f"Successful downloads: {len(successful_downloads)}")
        self.logger.info(f"Failed downloads: {len(failed_downloads)}")
        self.logger.info(f"Total data downloaded: {self.download_stats['total_bytes']:,} bytes")
        self.logger.info(f"Files saved to: {self.pdf_dir}")
        
        if successful_downloads:
            self.logger.info("\\nDownloaded files:")
            for download in successful_downloads:
                self.logger.info(f"  ✅ {download['filename']} ({download['file_size']:,} bytes)")
        
        if failed_downloads:
            self.logger.warning(f"\\nFailed downloads ({len(failed_downloads)}):")
            for failed in failed_downloads:
                self.logger.warning(f"  ❌ {failed['filename']}")
        
        return results

def main():
    """Main function with command line interface"""
    parser = argparse.ArgumentParser(description='Direct HS Nomenclature PDF Downloader')
    parser.add_argument('--start-code', default='0101',
                       help='Starting chapter code (default: 0101)')
    parser.add_argument('--max-chapters', type=int,
                       help='Maximum number of chapters to download')
    parser.add_argument('--output-dir', default='hs_nomenclature_data',
                       help='Output directory (default: hs_nomenclature_data)')
    parser.add_argument('--download-delay', type=float, default=1.0,
                       help='Delay between downloads in seconds (default: 1.0)')
    parser.add_argument('--verbose', action='store_true',
                       help='Enable verbose logging')
    parser.add_argument('--dry-run', action='store_true',
                       help='Discovery only, no downloads')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Create downloader
    downloader = DirectHSDownloader(output_dir=args.output_dir)
    
    if args.dry_run:
        # Discovery only
        print("DRY RUN MODE - Discovery only, no downloads")
        chapters = downloader.discover_all_chapters(args.start_code, args.max_chapters)
        downloader.save_discovery_results(chapters)
        print(f"\\nDiscovered {len(chapters)} chapters. Results saved to {args.output_dir}/discovery_results.json")
    else:
        # Full download
        results = downloader.run_complete_download(
            start_code=args.start_code,
            max_chapters=args.max_chapters,
            download_delay=args.download_delay
        )
        
        if results['success']:
            print(f"\\n🎉 SUCCESS! Downloaded {results['successful_downloads']} chapters to {results['output_directory']}")
            if results['failed_downloads'] > 0:
                print(f"⚠️  {results['failed_downloads']} downloads failed - check logs")
        else:
            print(f"❌ FAILED: {results.get('error', 'Unknown error')}")
            exit(1)

if __name__ == "__main__":
    main()