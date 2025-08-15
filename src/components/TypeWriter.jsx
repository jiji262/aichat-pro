import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";

// 代码块组件
const CodeBlock = ({ language, children }) => {
  return (
    <SyntaxHighlighter
      language={language || "text"}
      style={atomDark}
      className="rounded-md"
    >
      {String(children).replace(/\n$/, "")}
    </SyntaxHighlighter>
  );
};

export default function TypeWriter({ text, delay = 15, onComplete = () => {}, stopRef = null }) {
  const [displayedText, setDisplayedText] = useState('');
  const [index, setIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const containerRef = useRef(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [lastScrollTop, setLastScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState('auto');
  const chatContainerRef = useRef(null);
  const timeoutRef = useRef(null); // 用于存储setTimeout引用，便于清除
  
  // 初始化时保存聊天容器引用
  useEffect(() => {
    if (containerRef.current) {
      const parentElement = containerRef.current.parentElement;
      if (parentElement) {
        chatContainerRef.current = parentElement.closest('.overflow-y-auto');
      }
    }
  }, []);

  // 检查停止状态的函数
  const checkStopStatus = () => {
    if (stopRef && stopRef.current === true) {
      setIsComplete(true);
      setDisplayedText(text);
      setIndex(text.length);
      setContainerHeight('auto');
      // 通知父组件打字效果已完成
      onComplete();
      return true;
    }
    return false;
  };

  // 添加一个专门监听停止标志的effect
  useEffect(() => {
    // 如果stopRef存在且为true，立即停止
    if (stopRef && stopRef.current === true && !isComplete) {
      checkStopStatus();
    }
  }, [stopRef?.current, isComplete]); // 依赖于stopRef.current的变化

  useEffect(() => {
    // 重置状态当文本变化时
    setDisplayedText('');
    setIndex(0);
    setIsComplete(false);
    setShouldAutoScroll(true); // 新文本开始时重置自动滚动状态
    
    // 预计算容器高度，更精确的估算以避免大片空白
    if (text) {
      // 更精确的高度估算，考虑换行和代码块
      const linesEstimate = text.split('\n').length; // 计算换行数
      const codeBlocksCount = (text.match(/```/g) || []).length / 2; // 估算代码块数量
      
      // 基础高度 + 每行高度 + 代码块额外高度
      const baseHeight = 50; // 基础高度
      const lineHeight = 24; // 每行估计高度
      const codeBlockExtraHeight = 100; // 每个代码块额外高度
      
      const estimatedHeight = baseHeight + 
                             (linesEstimate * lineHeight) + 
                             (codeBlocksCount * codeBlockExtraHeight);
      
      // 设置最小高度，避免过大的空白区域
      setContainerHeight(`${Math.min(500, Math.max(100, estimatedHeight))}px`);
    }

    // 清除之前的timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // 立即检查是否需要停止
    checkStopStatus();
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [text, delay]);

  // 自动滚动效果，仅在用户视图接近底部时
  useEffect(() => {
    if (!chatContainerRef.current || !shouldAutoScroll) return;

    // 检查是否在底部附近（底部100px范围内）
    const container = chatContainerRef.current;
    const isNearBottom = 
      container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    
    // 只有在接近底部时才自动滚动，且记住当前滚动位置
    if (isNearBottom) {
      // 保存当前滚动位置
      setLastScrollTop(container.scrollTop);
      // 平滑滚动到底部
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }, [displayedText, shouldAutoScroll]);

  // 添加滚动事件监听，检测用户是否手动滚动
  useEffect(() => {
    const handleScroll = (event) => {
      const container = event.target;
      
      // 如果向上滚动了一定距离，则停止自动滚动
      if (container.scrollTop < lastScrollTop - 50) {
        setShouldAutoScroll(false);
      }
      
      // 如果滚动到接近底部，重新启用自动滚动
      const isNearBottom = 
        container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      
      if (isNearBottom) {
        setShouldAutoScroll(true);
      }
      
      // 更新最后滚动位置
      setLastScrollTop(container.scrollTop);
    };

    // 找到滚动容器并添加事件监听
    if (chatContainerRef.current) {
      chatContainerRef.current.addEventListener('scroll', handleScroll);
      return () => {
        if (chatContainerRef.current) {
          chatContainerRef.current.removeEventListener('scroll', handleScroll);
        }
      };
    }
  }, [lastScrollTop]);

  // 打字效果的主要逻辑
  useEffect(() => {
    // 如果文本为空或已完成，则不执行任何操作
    if (!text || isComplete) return;
    
    // 每次渲染都检查是否需要停止
    if (checkStopStatus()) return;
    
    // 如果还有字符要显示
    if (index < text.length) {
      // 存储timeout引用以便清除
      timeoutRef.current = setTimeout(() => {
        // 再次检查是否需要停止
        if (checkStopStatus()) return;
        
        // 添加下一个字符
        setDisplayedText((prev) => prev + text.charAt(index));
        setIndex((prev) => prev + 1);
      }, delay);
      
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    } else {
      // 所有字符已显示完毕
      setIsComplete(true);
      setContainerHeight('auto'); // 确保完成后高度自动调整
      onComplete();
    }
  }, [text, index, delay, isComplete, onComplete]);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        minHeight: containerHeight,
        transition: 'min-height 0.3s ease-in-out',
        overflow: 'hidden' // 防止内容溢出导致布局问题
      }}
    >
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            return !inline ? (
              <CodeBlock language={match ? match[1] : ""} {...props}>
                {children}
              </CodeBlock>
            ) : (
              <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded" {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {displayedText || " "}
      </ReactMarkdown>
    </div>
  );
} 