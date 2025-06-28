import React from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import { Breadcrumb } from 'antd';
import { HomeOutlined, FolderOutlined, FileOutlined, BarChartOutlined, PlusOutlined } from '@ant-design/icons';

interface BreadcrumbItem {
  title: React.ReactNode;
  href?: string;
}

const NavigationBreadcrumb: React.FC = () => {
  const location = useLocation();
  const params = useParams();

  const getBreadcrumbItems = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const items: BreadcrumbItem[] = [];

    // Always start with Home
    items.push({
      title: (
        <Link to="/" className="flex items-center">
          <HomeOutlined className="mr-1" />
          Projects
        </Link>
      )
    });

    // Handle different routes
    if (pathSegments.length === 0) {
      // Root path - just show Projects (already added above)
      return items;
    }

    switch (pathSegments[0]) {
      case 'project':
        if (params.projectId) {
          items.push({
            title: (
              <Link to={`/project/${params.projectId}`} className="flex items-center">
                <FolderOutlined className="mr-1" />
                Project {params.projectId}
              </Link>
            )
          });
        }
        break;

      case 'add-data':
        items.push({
          title: (
            <span className="flex items-center">
              <PlusOutlined className="mr-1" />
              Add Data
            </span>
          )
        });
        
        if (params.projectId) {
          // Remove the current Add Data item and add project context first
          items.pop();
          items.push({
            title: (
              <Link to={`/project/${params.projectId}`} className="flex items-center">
                <FolderOutlined className="mr-1" />
                Project {params.projectId}
              </Link>
            )
          });
          items.push({
            title: (
              <span className="flex items-center">
                <PlusOutlined className="mr-1" />
                Add Data
              </span>
            )
          });
        }
        break;

      case 'embeddings':
        if (params.embeddingId) {
          items.push({
            title: (
              <span className="flex items-center">
                <BarChartOutlined className="mr-1" />
                Visualization
              </span>
            )
          });
        }
        break;

      case 'file':
        if (params.fileId) {
          items.push({
            title: (
              <span className="flex items-center">
                <FileOutlined className="mr-1" />
                File {params.fileId}
              </span>
            )
          });
        }
        break;

      case 'job':
        if (params.jobId) {
          items.push({
            title: (
              <span className="flex items-center">
                <BarChartOutlined className="mr-1" />
                Job Progress
              </span>
            )
          });
        }
        break;

      default:
        // Handle unknown routes
        pathSegments.forEach((segment, index) => {
          const isLast = index === pathSegments.length - 1;
          const path = '/' + pathSegments.slice(0, index + 1).join('/');
          
          items.push({
            title: isLast ? (
              <span className="capitalize">{segment.replace('-', ' ')}</span>
            ) : (
              <Link to={path} className="capitalize">
                {segment.replace('-', ' ')}
              </Link>
            )
          });
        });
        break;
    }

    return items;
  };

  const items = getBreadcrumbItems();

  // Don't show breadcrumb if only one item (just home)
  if (items.length <= 1) {
    return null;
  }

  return (
    <div className="bg-gray-50 px-6 py-3 border-b">
      <Breadcrumb items={items} />
    </div>
  );
};

export default NavigationBreadcrumb;